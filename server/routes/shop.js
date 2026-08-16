import { Router } from 'express';
import Item from '../models/Item.js';
import ShopSale from '../models/ShopSale.js';
import ShopDebtPayment from '../models/ShopDebtPayment.js';
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
        defaultPrice: item.defaultPrice,
        isOverride: !!override,
      };
    })
  );
});

router.put('/prices/:itemId', async (req, res) => {
  const shopId = myShopId(req, res);
  if (!shopId) return;
  const item = await Item.findById(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'item not found' });
  const price = Number(req.body?.price);
  if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'invalid price' });
  const idx = item.priceOverrides.findIndex((o) => String(o.shopId) === String(shopId));
  if (idx >= 0) item.priceOverrides[idx].price = price;
  else item.priceOverrides.push({ shopId, price });
  await item.save();
  res.json({ itemId: item._id, price });
});

router.delete('/prices/:itemId', async (req, res) => {
  const shopId = myShopId(req, res);
  if (!shopId) return;
  const item = await Item.findById(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'item not found' });
  item.priceOverrides = item.priceOverrides.filter((o) => String(o.shopId) !== String(shopId));
  await item.save();
  res.json({ ok: true });
});

router.post('/items', async (req, res) => {
  const shopId = myShopId(req, res);
  if (!shopId) return;
  const { name, price: rawPrice, category } = req.body ?? {};
  const trimmed = name?.trim();
  const price = Number(rawPrice);
  if (!trimmed || !Number.isFinite(price) || price < 0) {
    return res.status(400).json({ error: 'name and price are required' });
  }
  const existing = await Item.findOne({ name: trimmed });
  if (existing) return res.status(400).json({ error: 'item name already exists' });
  // Only the admin sets the central/default price - an item added here is scoped
  // to this shop, with the typed price stored as this shop's override only.
  const item = await Item.create({
    name: trimmed,
    defaultPrice: 0,
    category: category?.trim() || null,
    shopIds: [shopId],
    priceOverrides: [{ shopId, price }],
  });
  res.json({ id: item._id, name: item.name, price, category: item.category });
});

router.post('/sales', async (req, res) => {
  const shopId = myShopId(req, res);
  if (!shopId) return;
  const { items, amountReceived, note, customerName, changeOverride } = req.body ?? {};
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
  const computedChange = Math.max(0, received - total);
  const customerOwed = Math.max(0, total - received);

  let change = computedChange;
  if (changeOverride !== undefined && changeOverride !== null && changeOverride !== '') {
    const overridden = Number(changeOverride);
    if (!Number.isFinite(overridden) || overridden < 0) return res.status(400).json({ error: 'invalid changeOverride' });
    change = overridden;
  }

  // Anything off-script (customer still owes, or the change given doesn't match
  // the exact computed amount) needs a name attached so it can be tracked down later.
  const nameTrimmed = customerName?.trim() || null;
  if ((customerOwed > 0 || change !== computedChange) && !nameTrimmed) {
    return res.status(400).json({ error: 'customerName is required' });
  }

  const sale = await ShopSale.create({
    shopId,
    createdBy: req.user.id,
    items: cleanItems,
    total,
    amountReceived: received,
    change,
    customerOwed,
    customerName: nameTrimmed,
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
    totalCustomerOwed: sales.reduce((s, x) => s + (x.paymentId ? 0 : x.customerOwed), 0),
  });
});

// Debt owed by customers of THIS shop's sales (customerOwed on ShopSale), grouped
// by the free-text customerName typed at sale time - there's no real customer
// entity here, the name string is the only handle we have to group by.
router.get('/debts', async (req, res) => {
  const shopId = myShopId(req, res);
  if (!shopId) return;
  const unpaid = await ShopSale.find({ shopId, customerOwed: { $gt: 0 }, paymentId: null, customerName: { $ne: null } });
  const byName = new Map();
  for (const s of unpaid) {
    const entry = byName.get(s.customerName) ?? { customerName: s.customerName, totalOwed: 0, saleCount: 0, lastAt: null };
    entry.totalOwed += s.customerOwed;
    entry.saleCount += 1;
    if (!entry.lastAt || s.createdAt > entry.lastAt) entry.lastAt = s.createdAt;
    byName.set(s.customerName, entry);
  }
  res.json([...byName.values()].sort((a, b) => b.totalOwed - a.totalOwed));
});

router.get('/debts/:customerName', async (req, res) => {
  const shopId = myShopId(req, res);
  if (!shopId) return;
  const name = decodeURIComponent(req.params.customerName);

  const unpaidSales = await ShopSale.find({ shopId, customerName: name, customerOwed: { $gt: 0 }, paymentId: null }).sort({
    createdAt: 1,
  });
  const payments = await ShopDebtPayment.find({ shopId, customerName: name }).sort({ paidAt: -1 });
  const payments2 = [];
  for (const p of payments) {
    const sales = await ShopSale.find({ _id: { $in: p.saleIds } }).sort({ createdAt: 1 });
    payments2.push({
      id: p._id,
      paidAt: p.paidAt,
      amount: p.amount,
      note: p.note,
      sales: sales.map((s) => ({ id: s._id, createdAt: s.createdAt, customerOwed: s.customerOwed, itemCount: s.items.length })),
    });
  }

  res.json({
    customerName: name,
    unpaidSales: unpaidSales.map((s) => ({
      id: s._id,
      createdAt: s.createdAt,
      total: s.total,
      amountReceived: s.amountReceived,
      customerOwed: s.customerOwed,
      itemCount: s.items.length,
    })),
    payments: payments2,
  });
});

router.post('/debts/payments', async (req, res) => {
  const shopId = myShopId(req, res);
  if (!shopId) return;
  const { customerName, saleIds, note } = req.body ?? {};
  const name = customerName?.trim();
  if (!name) return res.status(400).json({ error: 'customerName is required' });
  const ids = Array.isArray(saleIds) ? [...new Set(saleIds)] : [];
  if (ids.length === 0) return res.status(400).json({ error: 'saleIds must be a non-empty array' });

  const sales = await ShopSale.find({ _id: { $in: ids } });
  if (sales.length !== ids.length) return res.status(400).json({ error: 'some sales not found' });
  const invalid = sales.some(
    (s) => String(s.shopId) !== String(shopId) || s.customerName !== name || s.customerOwed <= 0 || s.paymentId !== null
  );
  if (invalid) return res.status(400).json({ error: 'all sales must belong to this shop and customer, and be unpaid' });

  const amount = sales.reduce((s, x) => s + x.customerOwed, 0);
  const payment = await ShopDebtPayment.create({ shopId, customerName: name, saleIds: ids, amount, note: note?.trim() || null });
  await ShopSale.updateMany({ _id: { $in: ids } }, { $set: { paymentId: payment._id } });
  res.json({ payment });
});

router.delete('/debts/payments/:id', async (req, res) => {
  const shopId = myShopId(req, res);
  if (!shopId) return;
  const payment = await ShopDebtPayment.findOne({ _id: req.params.id, shopId });
  if (!payment) return res.status(404).json({ error: 'payment not found' });
  await ShopSale.updateMany({ paymentId: payment._id }, { $set: { paymentId: null } });
  await ShopDebtPayment.deleteOne({ _id: payment._id });
  res.json({ ok: true });
});

export default router;
