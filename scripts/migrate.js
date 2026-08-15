// One-time import of the old sqlite-backup JSON into MongoDB, plus seed accounts.
// Run: node --env-file=.env scripts/migrate.js path/to/backup.json
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Shop from '../server/models/Shop.js';
import Item from '../server/models/Item.js';
import Bill from '../server/models/Bill.js';
import Payment from '../server/models/Payment.js';
import User from '../server/models/User.js';

const backupPath = process.argv[2];
if (!backupPath) {
  console.error('usage: node --env-file=.env scripts/migrate.js path/to/backup.json');
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
if (backup.format !== 'debt-tracker-backup') {
  console.error('not a debt-tracker-backup file');
  process.exit(1);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('connected to', mongoose.connection.name);

  console.log('wiping existing collections...');
  await Promise.all([Shop.deleteMany({}), Item.deleteMany({}), Bill.deleteMany({}), Payment.deleteMany({})]);

  const shopIdMap = new Map();
  for (const s of backup.tables.shops) {
    const doc = await Shop.create({ name: s.name, phone: s.phone, note: s.note, createdAt: new Date(s.created_at) });
    shopIdMap.set(s.id, doc._id);
  }
  console.log(`shops: ${shopIdMap.size}`);

  const shopsByItem = new Map();
  for (const link of backup.tables.item_shops) {
    if (!shopsByItem.has(link.item_id)) shopsByItem.set(link.item_id, []);
    shopsByItem.get(link.item_id).push(shopIdMap.get(link.shop_id));
  }
  const overridesByItem = new Map();
  for (const o of backup.tables.shop_item_prices) {
    if (!overridesByItem.has(o.item_id)) overridesByItem.set(o.item_id, []);
    overridesByItem.get(o.item_id).push({ shopId: shopIdMap.get(o.shop_id), price: o.price });
  }

  const itemIdMap = new Map();
  for (const it of backup.tables.items) {
    const doc = await Item.create({
      name: it.name,
      defaultPrice: it.default_price,
      category: it.category,
      active: it.active !== 0,
      shopIds: shopsByItem.get(it.id) ?? [],
      priceOverrides: overridesByItem.get(it.id) ?? [],
      createdAt: new Date(it.created_at),
    });
    itemIdMap.set(it.id, doc._id);
  }
  console.log(`items: ${itemIdMap.size}`);

  const paymentIdMap = new Map();
  for (const p of backup.tables.payments) {
    const doc = await Payment.create({
      shopId: shopIdMap.get(p.shop_id),
      amount: p.amount,
      paidAt: new Date(p.paid_at),
      note: p.note,
    });
    paymentIdMap.set(p.id, doc._id);
  }
  console.log(`payments: ${paymentIdMap.size}`);

  const entriesByBill = new Map();
  for (const e of backup.tables.bill_entries) {
    if (!entriesByBill.has(e.bill_id)) entriesByBill.set(e.bill_id, []);
    entriesByBill.get(e.bill_id).push({
      itemId: e.item_id ? itemIdMap.get(e.item_id) ?? null : null,
      itemName: e.item_name,
      unitPrice: e.unit_price,
      quantity: e.quantity,
    });
  }

  let billCount = 0;
  for (const b of backup.tables.bills) {
    await Bill.create({
      shopId: shopIdMap.get(b.shop_id),
      status: b.status,
      imported: b.imported === 1,
      openedAt: b.opened_at ? new Date(b.opened_at) : null,
      clearedAt: b.cleared_at ? new Date(b.cleared_at) : null,
      note: b.note,
      paymentId: b.payment_id ? paymentIdMap.get(b.payment_id) ?? null : null,
      entries: entriesByBill.get(b.id) ?? [],
    });
    billCount += 1;
  }
  console.log(`bills: ${billCount}`);

  // Seed one account per role so auth is usable immediately. CHANGE THESE PASSWORDS
  // after first login (admin > users).
  await User.deleteMany({});
  const firstShopId = [...shopIdMap.values()][0] ?? null;
  const seeds = [
    { username: 'admin', password: 'admin1234', role: 'admin', shopId: null, displayName: 'Admin' },
    { username: 'customer', password: 'customer1234', role: 'customer', shopId: null, displayName: 'Customer' },
    { username: 'shop', password: 'shop1234', role: 'shop', shopId: firstShopId, displayName: 'Shop' },
  ];
  for (const s of seeds) {
    const passwordHash = await bcrypt.hash(s.password, 10);
    await User.create({ username: s.username, passwordHash, role: s.role, shopId: s.shopId, displayName: s.displayName });
  }
  console.log('\nseed accounts (CHANGE PASSWORDS after first login):');
  for (const s of seeds) console.log(`  ${s.role.padEnd(9)} ${s.username} / ${s.password}`);

  await mongoose.disconnect();
  console.log('\ndone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
