import Bill from '../models/Bill.js';
import Payment from '../models/Payment.js';
import Item from '../models/Item.js';
import Shop from '../models/Shop.js';

function billTotal(bill) {
  return bill.entries.reduce((s, e) => s + e.unitPrice * e.quantity, 0);
}

export async function outstandingDebtOf(shopId) {
  const bills = await Bill.find({ shopId, status: 'cleared', paymentId: null });
  const billSum = bills.reduce((s, b) => s + billTotal(b), 0);

  const referencedPaymentIds = await Bill.distinct('paymentId', { paymentId: { $ne: null } });
  const freePayments = await Payment.find({ shopId, _id: { $nin: referencedPaymentIds } });
  const freeSum = freePayments.reduce((s, p) => s + p.amount, 0);

  return billSum - freeSum;
}

export async function pendingBillTotalOf(shopId) {
  const bills = await Bill.find({ shopId, status: 'open' });
  return bills.reduce((s, b) => s + billTotal(b), 0);
}

// Same numbers as outstandingDebtOf/pendingBillTotalOf, but for every shop in a
// handful of aggregate queries total instead of ~6 round trips per shop - the
// per-shop loop this replaced was the main source of slow list-page loads.
export async function getShopsSummaryMap() {
  const debtByShop = new Map();
  const pendingByShop = new Map();
  const freeByShop = new Map();
  const lastByShop = new Map();

  const debtAgg = await Bill.aggregate([
    { $match: { status: 'cleared', paymentId: null } },
    { $unwind: '$entries' },
    { $group: { _id: '$shopId', total: { $sum: { $multiply: ['$entries.unitPrice', '$entries.quantity'] } } } },
  ]);
  for (const row of debtAgg) debtByShop.set(String(row._id), row.total);

  const pendingAgg = await Bill.aggregate([
    { $match: { status: 'open' } },
    { $unwind: '$entries' },
    { $group: { _id: '$shopId', total: { $sum: { $multiply: ['$entries.unitPrice', '$entries.quantity'] } } } },
  ]);
  for (const row of pendingAgg) pendingByShop.set(String(row._id), row.total);

  const referencedPaymentIds = await Bill.distinct('paymentId', { paymentId: { $ne: null } });
  const freeAgg = await Payment.aggregate([
    { $match: { _id: { $nin: referencedPaymentIds } } },
    { $group: { _id: '$shopId', total: { $sum: '$amount' } } },
  ]);
  for (const row of freeAgg) freeByShop.set(String(row._id), row.total);

  const lastAgg = await Bill.aggregate([
    { $match: { status: 'cleared', imported: false } },
    {
      $project: {
        shopId: 1,
        kind: { $literal: 'bill' },
        occurredAt: '$clearedAt',
        amount: { $sum: { $map: { input: '$entries', as: 'e', in: { $multiply: ['$$e.unitPrice', '$$e.quantity'] } } } },
        entryCount: { $size: '$entries' },
      },
    },
    {
      $unionWith: {
        coll: 'payments',
        pipeline: [
          { $project: { shopId: 1, kind: { $literal: 'payment' }, occurredAt: '$paidAt', amount: 1, entryCount: { $literal: null } } },
        ],
      },
    },
    { $sort: { occurredAt: -1 } },
    { $group: { _id: '$shopId', doc: { $first: '$$ROOT' } } },
  ]);
  for (const row of lastAgg) lastByShop.set(String(row._id), row.doc);

  return { debtByShop, pendingByShop, freeByShop, lastByShop };
}

export function summaryFor(shopId, maps) {
  const key = String(shopId);
  const outstandingDebt = (maps.debtByShop.get(key) ?? 0) - (maps.freeByShop.get(key) ?? 0);
  const pendingBillTotal = maps.pendingByShop.get(key) ?? 0;
  const last = maps.lastByShop.get(key) ?? null;
  return {
    outstandingDebt,
    pendingBillTotal,
    lastActivityKind: last?.kind ?? null,
    lastActivityAt: last?.occurredAt ?? null,
    lastActivityAmount: last?.kind === 'payment' ? last.amount : null,
    lastActivityEntryCount: last?.kind === 'bill' ? last.entryCount : null,
  };
}

// Items visible to a shop: active, and either global (no shopIds) or explicitly listed.
export async function getShopPrices(shopId) {
  const items = await Item.find({
    active: true,
    $or: [{ shopIds: { $size: 0 } }, { shopIds: shopId }],
  }).sort({ name: 1 });

  const clearedBills = await Bill.find({ shopId, status: 'cleared', imported: false });
  const timesUsedByItem = new Map();
  for (const bill of clearedBills) {
    for (const entry of bill.entries) {
      if (!entry.itemId) continue;
      const key = String(entry.itemId);
      timesUsedByItem.set(key, (timesUsedByItem.get(key) ?? 0) + entry.quantity);
    }
  }

  return items.map((item) => {
    const override = item.priceOverrides.find((o) => String(o.shopId) === String(shopId));
    return {
      id: item._id,
      name: item.name,
      defaultPrice: item.defaultPrice,
      category: item.category,
      effectivePrice: override ? override.price : item.defaultPrice,
      isOverride: !!override,
      timesUsed: timesUsedByItem.get(String(item._id)) ?? 0,
    };
  });
}

export async function effectivePriceOf(shopId, itemId) {
  const item = await Item.findById(itemId);
  if (!item) return null;
  const override = item.priceOverrides.find((o) => String(o.shopId) === String(shopId));
  return { price: override ? override.price : item.defaultPrice, name: item.name };
}

export async function getOrCreateOpenBill(shopId) {
  let bill = await Bill.findOne({ shopId, status: 'open' });
  if (!bill) {
    bill = await Bill.create({ shopId, status: 'open', imported: false, openedAt: new Date() });
  }
  return bill;
}

export function serializeBill(bill) {
  return {
    id: bill._id,
    shopId: bill.shopId,
    status: bill.status,
    imported: bill.imported,
    openedAt: bill.openedAt,
    clearedAt: bill.clearedAt,
    note: bill.note,
    entries: bill.entries.map((e) => ({
      id: e._id,
      itemId: e.itemId,
      itemName: e.itemName,
      unitPrice: e.unitPrice,
      quantity: e.quantity,
    })),
    total: billTotal(bill),
  };
}

export async function getShopById(id) {
  const shop = await Shop.findById(id);
  if (!shop) throw Object.assign(new Error('shop not found'), { status: 404 });
  return shop;
}

export { billTotal };
