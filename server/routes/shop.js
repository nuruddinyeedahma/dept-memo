import { Router } from 'express';
import Item from '../models/Item.js';
import ShopSale from '../models/ShopSale.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = Router();
router.use(requireAuth, requireRole('shop'));

function myShopId(req, res) {
  if (!req.user.shopId) {
    res.status(400).json({ error: 'this account is not linked to a shop' });
    return null;
  }
  return req.user.shopId;
}

// Item catalog scoped to this shop-role user's shop (the one piece shared with the customer system).
router.get('/items', async (req, res) => {
  const shopId = myShopId(req, res);
  if (!shopId) return;
  const items = await Item.find({
    active: true,
    $or: [{ shopIds: { $size: 0 } }, { shopIds: shopId }],
  }).sort({ name: 1 });
  res.json(
    items.map((item) => {
      const override = item.priceOverrides.find((o) => String(o.shopId) === String(shopId));
      return {
        id: item._id,
        name: item.name,
        category: item.category,
        price: override ? override.price : item.defaultPrice,
      };
    })
  );
});

router.post('/sales', async (req, res) => {
  const shopId = myShopId(req, res);
  if (!shopId) return;
  const { items, amountReceived, note } = req.body ?? {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  const received = Number(amountReceived);
  if (!Number.isFinite(received) || received < 0) return res.status(400).json({ error: 'invalid amountReceived' });

  const cleanItems = items.map((i) => ({
    itemId: i.itemId || null,
    itemName: String(i.itemName),
    unitPrice: Number(i.unitPrice),
    quantity: Number(i.quantity),
  }));
  if (cleanItems.some((i) => !i.itemName || !Number.isFinite(i.unitPrice) || !Number.isInteger(i.quantity) || i.quantity <= 0)) {
    return res.status(400).json({ error: 'invalid item in items' });
  }

  const total = cleanItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const change = Math.max(0, received - total);
  const customerOwed = Math.max(0, total - received);

  const sale = await ShopSale.create({
    shopId,
    createdBy: req.user.id,
    items: cleanItems,
    total,
    amountReceived: received,
    change,
    customerOwed,
    note: note?.trim() || null,
  });
  res.json(sale);
});

function monthRange(monthParam) {
  let year, month0;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number);
    year = y;
    month0 = m - 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    month0 = now.getMonth();
  }
  return { year, month0, start: new Date(year, month0, 1), end: new Date(year, month0 + 1, 1) };
}

router.get('/sales', async (req, res) => {
  const shopId = myShopId(req, res);
  if (!shopId) return;
  if (req.query.month) {
    const { start, end } = monthRange(req.query.month);
    const sales = await ShopSale.find({ shopId, createdAt: { $gte: start, $lt: end } }).sort({ createdAt: -1 });
    return res.json(sales);
  }
  const sales = await ShopSale.find({ shopId }).sort({ createdAt: -1 }).limit(200);
  res.json(sales);
});

router.get('/summary', async (req, res) => {
  const shopId = myShopId(req, res);
  if (!shopId) return;
  const { year, month0, start, end } = monthRange(req.query.month);
  const sales = await ShopSale.find({ shopId, createdAt: { $gte: start, $lt: end } });
  res.json({
    month: `${year}-${String(month0 + 1).padStart(2, '0')}`,
    saleCount: sales.length,
    totalSales: sales.reduce((s, x) => s + x.total, 0),
    totalReceived: sales.reduce((s, x) => s + x.amountReceived, 0),
    totalCustomerOwed: sales.reduce((s, x) => s + x.customerOwed, 0),
  });
});

export default router;
