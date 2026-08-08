import { all, get, run } from '../connection.js';
import { getShopById } from './shops.js';

async function getOrCreateOpenBill(shopId) {
  let bill = await get("SELECT * FROM bills WHERE shop_id = ? AND status = 'open'", [shopId]);
  if (!bill) {
    const { lastInsertRowid } = await run(
      "INSERT INTO bills (shop_id, status, imported, opened_at) VALUES (?, 'open', 0, datetime('now'))",
      [shopId]
    );
    bill = await get('SELECT * FROM bills WHERE id = ?', [lastInsertRowid]);
  }
  return bill;
}

async function serializeBill(billId) {
  const bill = await get('SELECT * FROM bills WHERE id = ?', [billId]);
  if (!bill) return null;
  const entries = await all(
    'SELECT id, item_id AS itemId, item_name AS itemName, unit_price AS unitPrice, quantity FROM bill_entries WHERE bill_id = ? ORDER BY id',
    [billId]
  );
  const total = entries.reduce((sum, e) => sum + e.unitPrice * e.quantity, 0);
  return {
    id: bill.id,
    shopId: bill.shop_id,
    status: bill.status,
    imported: !!bill.imported,
    openedAt: bill.opened_at,
    clearedAt: bill.cleared_at,
    note: bill.note,
    entries,
    total,
  };
}

async function effectivePrice(shopId, itemId) {
  return get(
    `SELECT COALESCE(sip.price, i.default_price) AS price, i.name
     FROM items i
     LEFT JOIN shop_item_prices sip ON sip.item_id = i.id AND sip.shop_id = ?
     WHERE i.id = ?`,
    [shopId, itemId]
  );
}

export async function getOpenBill(shopId) {
  await getShopById(shopId);
  const bill = await getOrCreateOpenBill(shopId);
  return serializeBill(bill.id);
}

export async function addBillEntry(shopId, itemId, delta) {
  await getShopById(shopId);
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error('delta must be a non-zero integer');
  }
  const priced = await effectivePrice(shopId, itemId);
  if (!priced) throw new Error('item not found');

  const bill = await getOrCreateOpenBill(shopId);
  const existing = await get('SELECT * FROM bill_entries WHERE bill_id = ? AND item_id = ?', [bill.id, itemId]);

  if (!existing) {
    if (delta > 0) {
      await run(
        'INSERT INTO bill_entries (bill_id, item_id, item_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)',
        [bill.id, itemId, priced.name, priced.price, delta]
      );
    }
  } else {
    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      await run('DELETE FROM bill_entries WHERE id = ?', [existing.id]);
    } else {
      await run('UPDATE bill_entries SET quantity = ?, unit_price = ? WHERE id = ?', [newQty, priced.price, existing.id]);
    }
  }

  return serializeBill(bill.id);
}

export async function removeBillEntry(shopId, entryId) {
  await getShopById(shopId);
  const bill = await getOrCreateOpenBill(shopId);
  await run('DELETE FROM bill_entries WHERE id = ? AND bill_id = ?', [entryId, bill.id]);
  return serializeBill(bill.id);
}

export async function clearBill(shopId, note) {
  await getShopById(shopId);
  const bill = await getOrCreateOpenBill(shopId);
  if (bill.status === 'open') {
    const { c } = await get('SELECT COUNT(*) AS c FROM bill_entries WHERE bill_id = ?', [bill.id]);
    if (c === 0) throw new Error('bill has no entries');
  }
  const noteValue = note ? String(note).trim() || null : null;
  await run("UPDATE bills SET status = 'cleared', cleared_at = datetime('now'), note = ? WHERE id = ?", [noteValue, bill.id]);
  return serializeBill(bill.id);
}

export async function getShopBills(shopId) {
  await getShopById(shopId);
  const bills = await all(
    `SELECT b.id, b.imported, b.cleared_at AS occurredAt, b.note, b.payment_id AS paymentId,
            COALESCE((SELECT SUM(unit_price * quantity) FROM bill_entries WHERE bill_id = b.id), 0) AS amount,
            (SELECT COUNT(*) FROM bill_entries WHERE bill_id = b.id) AS entryCount,
            p.paid_at AS paymentAt
     FROM bills b
     LEFT JOIN payments p ON p.id = b.payment_id
     WHERE b.shop_id = ? AND b.status = 'cleared'
     ORDER BY b.cleared_at IS NULL ASC, b.cleared_at ASC, b.id ASC`,
    [shopId]
  );
  return bills.map((b) => ({ ...b, imported: !!b.imported, paid: b.paymentId !== null }));
}

export async function getShopPayments(shopId) {
  await getShopById(shopId);
  const rawPayments = await all(
    'SELECT id, paid_at AS paidAt, amount, note FROM payments WHERE shop_id = ? ORDER BY paid_at DESC, id DESC',
    [shopId]
  );
  const payments = [];
  for (const p of rawPayments) {
    const coveredBills = await all(
      `SELECT b.id, b.imported, b.cleared_at AS occurredAt,
              COALESCE((SELECT SUM(unit_price * quantity) FROM bill_entries WHERE bill_id = b.id), 0) AS amount
       FROM bills b WHERE b.payment_id = ?
       ORDER BY b.cleared_at IS NULL ASC, b.cleared_at ASC`,
      [p.id]
    );
    payments.push({ ...p, bills: coveredBills.map((b) => ({ ...b, imported: !!b.imported })) });
  }
  return payments;
}

export async function getHistory(shopId) {
  await getShopById(shopId);

  const rawBills = await all(
    `SELECT b.id, 'bill' AS kind, b.imported, b.cleared_at AS occurredAt, b.note, b.payment_id AS paymentId,
            COALESCE((SELECT SUM(unit_price * quantity) FROM bill_entries WHERE bill_id = b.id), 0) AS amount,
            (SELECT COUNT(*) FROM bill_entries WHERE bill_id = b.id) AS entryCount
     FROM bills b
     WHERE b.shop_id = ? AND b.status = 'cleared'`,
    [shopId]
  );
  const bills = rawBills.map((b) => ({ ...b, imported: !!b.imported, paid: b.paymentId !== null }));

  const rawPayments = await all(
    `SELECT id, 'payment' AS kind, amount, paid_at AS occurredAt, note FROM payments WHERE shop_id = ?`,
    [shopId]
  );
  const payments = [];
  for (const p of rawPayments) {
    const coveredBills = await all(
      `SELECT b.id, b.imported, b.cleared_at AS occurredAt,
              COALESCE((SELECT SUM(unit_price * quantity) FROM bill_entries WHERE bill_id = b.id), 0) AS amount
       FROM bills b WHERE b.payment_id = ?
       ORDER BY b.cleared_at IS NULL ASC, b.cleared_at ASC`,
      [p.id]
    );
    payments.push({ ...p, imported: false, bills: coveredBills.map((b) => ({ ...b, imported: !!b.imported })) });
  }

  return [...bills, ...payments].sort((a, b) => {
    if (a.occurredAt === b.occurredAt) return 0;
    if (a.occurredAt === null) return 1;
    if (b.occurredAt === null) return -1;
    return a.occurredAt < b.occurredAt ? 1 : -1;
  });
}

export async function getBill(billId) {
  const bill = await serializeBill(billId);
  if (!bill) throw new Error('bill not found');
  return bill;
}
