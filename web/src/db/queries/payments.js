import { all, get, run } from '../connection.js';
import { getShopById, outstandingDebtOf } from './shops.js';

export async function createPayment(shopId, billIds, note) {
  const shop = await getShopById(shopId);

  const ids = Array.isArray(billIds) ? [...new Set(billIds.map(Number).filter(Number.isInteger))] : [];
  if (ids.length === 0) throw new Error('billIds must be a non-empty array');

  const placeholders = ids.map(() => '?').join(',');
  const bills = await all(`SELECT id, shop_id, status, payment_id FROM bills WHERE id IN (${placeholders})`, ids);

  if (bills.length !== ids.length) throw new Error('some bills not found');
  const invalid = bills.some((b) => b.shop_id !== shop.id || b.status !== 'cleared' || b.payment_id !== null);
  if (invalid) throw new Error('all bills must belong to this shop, be cleared, and unpaid');

  const { total: amount } = await get(
    `SELECT COALESCE(SUM(unit_price * quantity), 0) AS total FROM bill_entries WHERE bill_id IN (${placeholders})`,
    ids
  );

  const noteValue = note ? String(note).trim() || null : null;
  const { lastInsertRowid } = await run('INSERT INTO payments (shop_id, amount, note) VALUES (?, ?, ?)', [
    shop.id,
    amount,
    noteValue,
  ]);
  await run(`UPDATE bills SET payment_id = ? WHERE id IN (${placeholders})`, [lastInsertRowid, ...ids]);

  const payment = await get('SELECT id, shop_id AS shopId, amount, paid_at AS paidAt, note FROM payments WHERE id = ?', [
    lastInsertRowid,
  ]);
  return { payment, outstandingDebt: await outstandingDebtOf(shop.id) };
}

export async function deletePayment(shopId, paymentId) {
  const shop = await getShopById(shopId);
  const payment = await get('SELECT * FROM payments WHERE id = ? AND shop_id = ?', [paymentId, shop.id]);
  if (!payment) throw new Error('payment not found');
  // Explicit instead of relying on the bills.payment_id ON DELETE SET NULL foreign key,
  // which doesn't reliably cascade under sql.js's WASM sqlite build.
  await run('UPDATE bills SET payment_id = NULL WHERE payment_id = ?', [payment.id]);
  await run('DELETE FROM payments WHERE id = ?', [payment.id]);
  return { outstandingDebt: await outstandingDebtOf(shop.id) };
}
