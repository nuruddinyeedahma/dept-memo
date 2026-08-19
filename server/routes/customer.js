import { Router } from 'express';
import Shop from '../models/Shop.js';
import Item from '../models/Item.js';
import Bill from '../models/Bill.js';
import Payment from '../models/Payment.js';
import { requireAuth, requireRole } from '../lib/auth.js';
import {
  outstandingDebtOf,
  pendingBillTotalOf,
  getShopPrices,
  effectivePriceOf,
  getOrCreateOpenBill,
  serializeBill,
  getShopById,
  billTotal,
  getShopsSummaryMap,
  summaryFor,
} from '../lib/domain.js';

const router = Router();
router.use(requireAuth, requireRole('customer'));

router.get('/shops', async (req, res) => {
  const [shops, maps] = await Promise.all([Shop.find().sort({ name: 1 }), getShopsSummaryMap()]);
  res.json(
    shops.map((shop) => ({
      id: shop._id,
      name: shop.name,
      phone: shop.phone,
      note: shop.note,
      ...summaryFor(shop._id, maps),
    }))
  );
});

router.get('/shops/:shopId', async (req, res) => {
  const shop = await getShopById(req.params.shopId);
  const [outstandingDebt, pendingBillTotal] = await Promise.all([
    outstandingDebtOf(shop._id),
    pendingBillTotalOf(shop._id),
  ]);
  res.json({ id: shop._id, name: shop.name, phone: shop.phone, note: shop.note, outstandingDebt, pendingBillTotal });
});

function toShopDto(shop) {
  return { id: shop._id, name: shop.name, phone: shop.phone, note: shop.note };
}

router.post('/shops', async (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  const existing = await Shop.findOne({ name });
  if (existing) return res.status(400).json({ error: 'shop name already exists' });
  const shop = await Shop.create({ name });
  res.json(toShopDto(shop));
});

router.patch('/shops/:shopId', async (req, res) => {
  const shop = await getShopById(req.params.shopId);
  const { name, phone, note } = req.body ?? {};
  if (name !== undefined) shop.name = String(name).trim();
  if (phone !== undefined) shop.phone = String(phone).trim() || null;
  if (note !== undefined) shop.note = String(note).trim() || null;
  if (!shop.name) return res.status(400).json({ error: 'name is required' });
  await shop.save();
  res.json(toShopDto(shop));
});

router.delete('/shops/:shopId', async (req, res) => {
  const shop = await getShopById(req.params.shopId);
  if ((await outstandingDebtOf(shop._id)) !== 0) {
    return res.status(400).json({ error: 'shop still has outstanding debt' });
  }
  await Shop.deleteOne({ _id: shop._id });
  res.json({ ok: true });
});

router.get('/summary', async (req, res) => {
  const [shops, maps] = await Promise.all([Shop.find(), getShopsSummaryMap()]);
  let totalOutstanding = 0;
  let shopsWithDebt = 0;
  let totalPendingBills = 0;
  for (const shop of shops) {
    const { outstandingDebt, pendingBillTotal } = summaryFor(shop._id, maps);
    totalOutstanding += outstandingDebt;
    if (outstandingDebt > 0) shopsWithDebt += 1;
    totalPendingBills += pendingBillTotal;
  }
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const paymentsThisMonth = await Payment.aggregate([
    { $match: { paidAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  res.json({
    totalOutstanding,
    shopsWithDebt,
    totalShops: shops.length,
    paymentsThisMonth: paymentsThisMonth[0]?.total ?? 0,
    totalPendingBills,
  });
});

router.get('/shops/:shopId/prices', async (req, res) => {
  await getShopById(req.params.shopId);
  res.json(await getShopPrices(req.params.shopId));
});

router.post('/items', async (req, res) => {
  const { name, price: rawPrice, category, shopId } = req.body ?? {};
  const trimmed = name?.trim();
  const price = Number(rawPrice);
  if (!trimmed || !Number.isFinite(price) || price < 0) {
    return res.status(400).json({ error: 'name and price are required' });
  }
  if (!shopId) return res.status(400).json({ error: 'shopId is required' });
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

router.put('/shops/:shopId/prices/:itemId', async (req, res) => {
  await getShopById(req.params.shopId);
  const item = await Item.findById(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'item not found' });
  const price = Number(req.body?.price);
  if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'invalid price' });
  const idx = item.priceOverrides.findIndex((o) => String(o.shopId) === req.params.shopId);
  if (idx >= 0) item.priceOverrides[idx].price = price;
  else item.priceOverrides.push({ shopId: req.params.shopId, price });
  await item.save();
  res.json({ shopId: req.params.shopId, itemId: item._id, price });
});

router.delete('/shops/:shopId/prices/:itemId', async (req, res) => {
  await getShopById(req.params.shopId);
  const item = await Item.findById(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'item not found' });
  item.priceOverrides = item.priceOverrides.filter((o) => String(o.shopId) !== req.params.shopId);
  await item.save();
  res.json({ ok: true });
});

router.get('/shops/:shopId/open-bill', async (req, res) => {
  await getShopById(req.params.shopId);
  const bill = await getOrCreateOpenBill(req.params.shopId);
  res.json(serializeBill(bill));
});

router.post('/shops/:shopId/bill-entries', async (req, res) => {
  await getShopById(req.params.shopId);
  const { itemId, delta } = req.body ?? {};
  if (!Number.isInteger(delta) || delta === 0) return res.status(400).json({ error: 'delta must be a non-zero integer' });
  const priced = await effectivePriceOf(req.params.shopId, itemId);
  if (!priced) return res.status(404).json({ error: 'item not found' });

  const bill = await getOrCreateOpenBill(req.params.shopId);
  const existing = bill.entries.find((e) => String(e.itemId) === String(itemId));
  if (!existing) {
    if (delta > 0) bill.entries.push({ itemId, itemName: priced.name, unitPrice: priced.price, quantity: delta });
  } else {
    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      bill.entries = bill.entries.filter((e) => e !== existing);
    } else {
      existing.quantity = newQty;
      existing.unitPrice = priced.price;
    }
  }
  await bill.save();
  res.json(serializeBill(bill));
});

router.delete('/shops/:shopId/bill-entries/:entryId', async (req, res) => {
  await getShopById(req.params.shopId);
  const bill = await getOrCreateOpenBill(req.params.shopId);
  bill.entries = bill.entries.filter((e) => String(e._id) !== req.params.entryId);
  await bill.save();
  res.json(serializeBill(bill));
});

router.post('/shops/:shopId/clear-bill', async (req, res) => {
  await getShopById(req.params.shopId);
  const bill = await getOrCreateOpenBill(req.params.shopId);
  if (bill.entries.length === 0) return res.status(400).json({ error: 'bill has no entries' });
  bill.status = 'cleared';
  bill.clearedAt = new Date();
  bill.note = req.body?.note?.trim() || null;
  await bill.save();
  res.json(serializeBill(bill));
});

router.get('/shops/:shopId/bills', async (req, res) => {
  await getShopById(req.params.shopId);
  const bills = await Bill.find({ shopId: req.params.shopId, status: 'cleared' }).sort({ clearedAt: 1, _id: 1 });
  const payments = await Payment.find({ _id: { $in: bills.map((b) => b.paymentId).filter(Boolean) } });
  const paymentById = new Map(payments.map((p) => [String(p._id), p]));
  res.json(
    bills.map((b) => ({
      id: b._id,
      imported: b.imported,
      occurredAt: b.clearedAt,
      note: b.note,
      paymentId: b.paymentId,
      amount: billTotal(b),
      entryCount: b.entries.length,
      paymentAt: b.paymentId ? paymentById.get(String(b.paymentId))?.paidAt : null,
      paid: b.paymentId !== null,
    }))
  );
});

router.post('/shops/:shopId/payments', async (req, res) => {
  const shop = await getShopById(req.params.shopId);
  const ids = Array.isArray(req.body?.billIds) ? [...new Set(req.body.billIds)] : [];
  if (ids.length === 0) return res.status(400).json({ error: 'billIds must be a non-empty array' });

  const bills = await Bill.find({ _id: { $in: ids } });
  if (bills.length !== ids.length) return res.status(400).json({ error: 'some bills not found' });
  const invalid = bills.some((b) => String(b.shopId) !== String(shop._id) || b.status !== 'cleared' || b.paymentId !== null);
  if (invalid) return res.status(400).json({ error: 'all bills must belong to this shop, be cleared, and unpaid' });

  const amount = bills.reduce((s, b) => s + billTotal(b), 0);
  const payment = await Payment.create({ shopId: shop._id, amount, note: req.body?.note?.trim() || null });
  await Bill.updateMany({ _id: { $in: ids } }, { $set: { paymentId: payment._id } });

  res.json({ payment, outstandingDebt: await outstandingDebtOf(shop._id) });
});

router.post('/shops/:shopId/payments/direct', async (req, res) => {
  const shop = await getShopById(req.params.shopId);
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'amount must be a positive number' });
  const payment = await Payment.create({ shopId: shop._id, amount, note: req.body?.note?.trim() || null });
  res.json({ payment, outstandingDebt: await outstandingDebtOf(shop._id) });
});

router.get('/shops/:shopId/payments', async (req, res) => {
  await getShopById(req.params.shopId);
  const payments = await Payment.find({ shopId: req.params.shopId }).sort({ paidAt: -1, _id: -1 });
  const result = [];
  for (const p of payments) {
    const coveredBills = await Bill.find({ paymentId: p._id }).sort({ clearedAt: 1 });
    result.push({
      id: p._id,
      paidAt: p.paidAt,
      amount: p.amount,
      note: p.note,
      bills: coveredBills.map((b) => ({ id: b._id, imported: b.imported, occurredAt: b.clearedAt, amount: billTotal(b) })),
    });
  }
  res.json(result);
});

router.delete('/shops/:shopId/payments/:paymentId', async (req, res) => {
  const shop = await getShopById(req.params.shopId);
  const payment = await Payment.findOne({ _id: req.params.paymentId, shopId: shop._id });
  if (!payment) return res.status(404).json({ error: 'payment not found' });
  await Bill.updateMany({ paymentId: payment._id }, { $set: { paymentId: null } });
  await Payment.deleteOne({ _id: payment._id });
  res.json({ outstandingDebt: await outstandingDebtOf(shop._id) });
});

router.get('/shops/:shopId/history', async (req, res) => {
  await getShopById(req.params.shopId);
  const bills = await Bill.find({ shopId: req.params.shopId, status: 'cleared' });
  const billEvents = bills.map((b) => ({
    id: b._id,
    kind: 'bill',
    imported: b.imported,
    occurredAt: b.clearedAt,
    note: b.note,
    paymentId: b.paymentId,
    amount: billTotal(b),
    entryCount: b.entries.length,
    paid: b.paymentId !== null,
  }));

  const payments = await Payment.find({ shopId: req.params.shopId });
  const paymentEvents = [];
  for (const p of payments) {
    const coveredBills = await Bill.find({ paymentId: p._id }).sort({ clearedAt: 1 });
    paymentEvents.push({
      id: p._id,
      kind: 'payment',
      amount: p.amount,
      occurredAt: p.paidAt,
      note: p.note,
      imported: false,
      bills: coveredBills.map((b) => ({ id: b._id, imported: b.imported, occurredAt: b.clearedAt, amount: billTotal(b) })),
    });
  }

  const all = [...billEvents, ...paymentEvents].sort((a, b) => {
    if (a.occurredAt === b.occurredAt) return 0;
    if (!a.occurredAt) return 1;
    if (!b.occurredAt) return -1;
    return new Date(a.occurredAt) < new Date(b.occurredAt) ? 1 : -1;
  });
  res.json(all);
});

router.get('/bills/:billId', async (req, res) => {
  const bill = await Bill.findById(req.params.billId);
  if (!bill) return res.status(404).json({ error: 'bill not found' });
  res.json(serializeBill(bill));
});

// Only a cleared, unpaid bill can be corrected - once a payment has been
// recorded against it, its total is load-bearing for that payment amount.
router.put('/bills/:billId', async (req, res) => {
  const bill = await Bill.findById(req.params.billId);
  if (!bill) return res.status(404).json({ error: 'bill not found' });
  if (bill.status !== 'cleared' || bill.paymentId) {
    return res.status(400).json({ error: 'only unpaid, finalized bills can be edited' });
  }

  const { entries, note } = req.body ?? {};
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries must be a non-empty array' });
  }
  const cleanEntries = entries.map((e) => ({
    itemId: e.itemId || null,
    itemName: String(e.itemName),
    unitPrice: Number(e.unitPrice),
    quantity: Number(e.quantity),
  }));
  if (cleanEntries.some((e) => !e.itemName || !Number.isFinite(e.unitPrice) || !Number.isInteger(e.quantity) || e.quantity <= 0)) {
    return res.status(400).json({ error: 'invalid entry' });
  }

  bill.entries = cleanEntries;
  if (note !== undefined) bill.note = note?.trim() || null;
  await bill.save();
  res.json(serializeBill(bill));
});

export default router;
