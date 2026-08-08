// Imported from the user's original Numbers files (PriceList sheet, 32 items).
const PRICE_LIST = [
  ['บิ๊ก', 5], ['มิโดริ', 6], ['ซือดะ', 7], ['โค้กกลาง', 19], ['สแนคแจ็ก', 5],
  ['เทสโต', 5], ['ซันไบท์', 5], ['น้ำ 5 บาท', 5], ['คอนเน่', 5], ['โรลเลอร์โคสเตอร์', 5],
  ['โซดา', 10], ['โอดิบ', 10], ['บิ๊กม่วง', 5], ['ดีโด้ส้ม', 3], ['ฮายี', 7],
  ['รุสกี', 7], ['ตะวัน', 5], ['โดโซะ', 5], ['จิ๊กโก๋', 3], ['ขนม2บาท', 2],
  ['มาม่าซือดะ', 7], ['น้ำมิโดริ', 5], ['แคมปัส', 5], ['เอส', 5], ['เมษา', 5],
  ['โรลเลอร์คอร์น', 5], ['โค้กขวดกลาง', 18], ['ขนม 5 บาท', 5], ['ผ้าอนามัย', 18],
  ['ดีมอลต์', 7], ['ฉลาม', 13], ['ปาปริก้า', 5],
];

// Aggregated from RoundN "cleared" sheets (row-per-unit collapsed into quantities).
// Totals verified against each sheet's original "รวมทั้งหมด": 147, 239, 76, 145, 114.
const IMPORTED_BILLS = [
  {
    total: 147,
    entries: [
      ['มาม่าซือดะ', 7, 1], ['น้ำมิโดริ', 5, 1], ['แคมปัส', 5, 1], ['เอส', 5, 3],
      ['มิโดริ', 6, 2], ['เมษา', 5, 1], ['โรลเลอร์คอร์น', 5, 2], ['โอดิบ', 10, 4],
      ['โค้กขวดกลาง', 18, 2], ['รุสกี', 7, 1], ['บิ๊ก', 5, 1],
    ],
  },
  {
    total: 239,
    entries: [
      ['โอดิบ', 10, 1], ['บิ๊กม่วง', 5, 1], ['ซือดะ', 7, 6], ['บิ๊ก', 5, 11],
      ['ดีโด้ส้ม', 3, 1], ['โค้กกลาง', 19, 3], ['ฮายี', 7, 1], ['รุสกี', 7, 1],
      ['สแนคแจ็ก', 5, 2], ['มิโดริ', 6, 2], ['ซันไบท์', 5, 1], ['ตะวัน', 5, 1],
      ['เทสโต', 5, 1], ['โดโซะ', 5, 1], ['จิ๊กโก๋', 3, 3], ['ขนม2บาท', 2, 1],
    ],
  },
  {
    total: 76,
    entries: [
      ['บิ๊ก', 5, 5], ['มิโดริ', 6, 1], ['โค้กกลาง', 19, 2], ['ซือดะ', 7, 1],
    ],
  },
  {
    total: 145,
    entries: [
      ['โซดา', 10, 1], ['เทสโต', 5, 1], ['ซันไบท์', 5, 1], ['ซือดะ', 7, 2],
      ['มิโดริ', 6, 2], ['สแนคแจ็ก', 5, 2], ['คอนเน่', 5, 1], ['โรลเลอร์โคสเตอร์', 5, 1],
      ['บิ๊ก', 5, 9], ['น้ำ 5 บาท', 5, 1], ['รุสกี', 7, 1], ['แคมปัส', 5, 1],
      ['ฮายี', 7, 1], ['ปาปริก้า', 5, 1], ['ขนม 5 บาท', 5, 1],
    ],
  },
  {
    total: 114,
    entries: [
      ['ซือดะ', 7, 3], ['มิโดริ', 6, 1], ['โค้กกลาง', 19, 1], ['ผ้าอนามัย', 18, 1],
      ['ดีมอลต์', 7, 2], ['ฉลาม', 13, 1], ['บิ๊ก', 5, 1], ['ดีโด้ส้ม', 3, 1],
      ['ขนม 5 บาท', 5, 3],
    ],
  },
];

export async function seedIfEmpty({ get, run }) {
  const { count } = await get('SELECT COUNT(*) AS count FROM shops');
  if (count > 0) return;

  const itemIds = new Map();
  for (const [name, price] of PRICE_LIST) {
    const { lastInsertRowid } = await run('INSERT INTO items (name, default_price) VALUES (?, ?)', [name, price]);
    itemIds.set(name, lastInsertRowid);
  }

  const { lastInsertRowid: shopId } = await run('INSERT INTO shops (name) VALUES (?)', ['กะนี']);

  for (const bill of IMPORTED_BILLS) {
    const { lastInsertRowid: billId } = await run(
      "INSERT INTO bills (shop_id, status, imported, opened_at, cleared_at) VALUES (?, 'cleared', 1, NULL, NULL)",
      [shopId]
    );
    let sum = 0;
    for (const [name, price, qty] of bill.entries) {
      await run(
        'INSERT INTO bill_entries (bill_id, item_id, item_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)',
        [billId, itemIds.get(name) ?? null, name, price, qty]
      );
      sum += price * qty;
    }
    if (sum !== bill.total) {
      throw new Error(`Seed total mismatch for bill ${billId}: expected ${bill.total}, got ${sum}`);
    }
  }

  console.log('Seeded local database: 32 items, 1 shop (กะนี), 5 imported bills.');
}
