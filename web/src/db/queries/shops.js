import { all, get, run } from '../connection.js';

async function getShopById(id) {
  const shop = await get('SELECT * FROM shops WHERE id = ?', [id]);
  if (!shop) throw new Error('shop not found');
  return shop;
}

export async function outstandingDebtOf(shopId) {
  const row = await get(
    `SELECT
       COALESCE((SELECT SUM(be.unit_price * be.quantity)
                 FROM bills b JOIN bill_entries be ON be.bill_id = b.id
                 WHERE b.shop_id = ? AND b.status = 'cleared' AND b.payment_id IS NULL), 0)
       - COALESCE((SELECT SUM(p.amount) FROM payments p
                   WHERE p.shop_id = ? AND NOT EXISTS (SELECT 1 FROM bills WHERE payment_id = p.id)), 0)
       AS outstandingDebt`,
    [shopId, shopId]
  );
  return row.outstandingDebt;
}

export async function getShops() {
  return all(
    `WITH events AS (
      SELECT b.shop_id AS shop_id, 'bill' AS kind, b.cleared_at AS occurred_at,
             (SELECT SUM(unit_price * quantity) FROM bill_entries WHERE bill_id = b.id) AS amount,
             (SELECT COUNT(*) FROM bill_entries WHERE bill_id = b.id) AS entry_count
      FROM bills b WHERE b.status = 'cleared' AND b.imported = 0
      UNION ALL
      SELECT p.shop_id, 'payment', p.paid_at, p.amount, NULL
      FROM payments p
    ),
    ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY shop_id ORDER BY occurred_at DESC) AS rn
      FROM events
    )
    SELECT s.id, s.name, s.phone, s.note,
      COALESCE(debt.total, 0) - COALESCE(freepay.total, 0) AS outstandingDebt,
      r.kind AS lastActivityKind, r.occurred_at AS lastActivityAt,
      r.amount AS lastActivityAmount, r.entry_count AS lastActivityEntryCount
    FROM shops s
    LEFT JOIN ranked r ON r.shop_id = s.id AND r.rn = 1
    LEFT JOIN (
      SELECT b.shop_id, SUM(be.unit_price * be.quantity) AS total
      FROM bills b JOIN bill_entries be ON be.bill_id = b.id
      WHERE b.status = 'cleared' AND b.payment_id IS NULL
      GROUP BY b.shop_id
    ) debt ON debt.shop_id = s.id
    LEFT JOIN (
      SELECT p.shop_id, SUM(p.amount) AS total
      FROM payments p
      WHERE NOT EXISTS (SELECT 1 FROM bills WHERE payment_id = p.id)
      GROUP BY p.shop_id
    ) freepay ON freepay.shop_id = s.id
    ORDER BY s.name`
  );
}

export async function createShop(name) {
  const trimmed = name?.trim();
  if (!trimmed) throw new Error('name is required');
  const existing = await get('SELECT id FROM shops WHERE name = ?', [trimmed]);
  if (existing) throw new Error('shop name already exists');
  const { lastInsertRowid } = await run('INSERT INTO shops (name) VALUES (?)', [trimmed]);
  return get('SELECT id, name, phone, note FROM shops WHERE id = ?', [lastInsertRowid]);
}

export async function updateShop(id, patch) {
  const shop = await getShopById(id);
  const name = patch.name !== undefined ? String(patch.name).trim() : shop.name;
  const phone = patch.phone !== undefined ? String(patch.phone).trim() || null : shop.phone;
  const note = patch.note !== undefined ? String(patch.note).trim() || null : shop.note;
  if (!name) throw new Error('name is required');
  await run('UPDATE shops SET name = ?, phone = ?, note = ? WHERE id = ?', [name, phone, note, shop.id]);
  return { id: shop.id, name, phone, note };
}

export async function deleteShop(id) {
  const shop = await getShopById(id);
  if ((await outstandingDebtOf(shop.id)) !== 0) {
    throw new Error('shop still has outstanding debt');
  }
  await run('DELETE FROM shops WHERE id = ?', [shop.id]);
}

export async function getShopPrices(shopId) {
  await getShopById(shopId);
  const rows = await all(
    `SELECT i.id, i.name, i.default_price AS defaultPrice, i.category,
            sip.price AS overridePrice,
            COALESCE((
              SELECT SUM(be.quantity) FROM bill_entries be
              JOIN bills b ON b.id = be.bill_id
              WHERE be.item_id = i.id AND b.shop_id = ? AND b.status = 'cleared' AND b.imported = 0
            ), 0) AS timesUsed
     FROM items i
     LEFT JOIN shop_item_prices sip ON sip.item_id = i.id AND sip.shop_id = ?
     WHERE NOT EXISTS (SELECT 1 FROM item_shops WHERE item_id = i.id)
        OR EXISTS (SELECT 1 FROM item_shops WHERE item_id = i.id AND shop_id = ?)
     ORDER BY i.name`,
    [shopId, shopId, shopId]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    defaultPrice: r.defaultPrice,
    category: r.category,
    effectivePrice: r.overridePrice ?? r.defaultPrice,
    isOverride: r.overridePrice !== null,
    timesUsed: r.timesUsed,
  }));
}

export async function setShopPrice(shopId, itemId, price) {
  await getShopById(shopId);
  const item = await get('SELECT id FROM items WHERE id = ?', [itemId]);
  if (!item) throw new Error('item not found');
  const value = Number(price);
  if (!Number.isFinite(value) || value < 0) throw new Error('price must be a non-negative number');
  await run(
    `INSERT INTO shop_item_prices (shop_id, item_id, price) VALUES (?, ?, ?)
     ON CONFLICT(shop_id, item_id) DO UPDATE SET price = excluded.price`,
    [shopId, itemId, value]
  );
  return { shopId, itemId, price: value };
}

export async function clearShopPrice(shopId, itemId) {
  await getShopById(shopId);
  await run('DELETE FROM shop_item_prices WHERE shop_id = ? AND item_id = ?', [shopId, itemId]);
}

export { getShopById };
