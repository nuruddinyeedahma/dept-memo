import { get } from '../connection.js';

export async function getSummary() {
  const { totalShops } = await get('SELECT COUNT(*) AS totalShops FROM shops');

  const { totalOutstanding, shopsWithDebt } = await get(
    `WITH per_shop AS (
      SELECT s.id,
        COALESCE(debt.total, 0) AS outstandingDebt
      FROM shops s
      LEFT JOIN (
        SELECT b.shop_id, SUM(be.unit_price * be.quantity) AS total
        FROM bills b JOIN bill_entries be ON be.bill_id = b.id
        WHERE b.status = 'cleared' AND b.payment_id IS NULL
        GROUP BY b.shop_id
      ) debt ON debt.shop_id = s.id
    )
    SELECT COALESCE(SUM(outstandingDebt), 0) AS totalOutstanding,
           COALESCE(SUM(CASE WHEN outstandingDebt > 0 THEN 1 ELSE 0 END), 0) AS shopsWithDebt
    FROM per_shop`
  );

  const { paymentsThisMonth } = await get(
    `SELECT COALESCE(SUM(amount), 0) AS paymentsThisMonth
     FROM payments
     WHERE strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')`
  );

  return { totalOutstanding, shopsWithDebt, totalShops, paymentsThisMonth };
}
