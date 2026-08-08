const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

function toDate(iso) {
  if (!iso) return null;
  return new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
}

export function formatMoney(n) {
  return (n ?? 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

export function formatRelativeThai(iso) {
  const d = toDate(iso);
  if (!d) return 'นำเข้าจากข้อมูลเก่า';
  const now = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days <= 0) return 'วันนี้';
  if (days === 1) return 'เมื่อวาน';
  if (days < 7) return `${days} วันก่อน`;
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function formatDateTimeThai(iso) {
  const d = toDate(iso);
  if (!d) return 'นำเข้าจากข้อมูลเก่า';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543} · ${hh}:${mm}`;
}

export function formatThaiMonthYear(iso) {
  const d = toDate(iso);
  if (!d) return 'นำเข้าจากข้อมูลเก่า';
  return `${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function groupByThaiMonth(entries, dateField = 'occurredAt') {
  const dated = [];
  const undated = [];
  for (const e of entries) {
    if (e[dateField]) dated.push(e);
    else undated.push(e);
  }

  const buckets = new Map();
  for (const e of dated) {
    const d = toDate(e[dateField]);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    if (!buckets.has(key)) {
      buckets.set(key, { key, label: formatThaiMonthYear(e[dateField]), entries: [], paid: 0, billed: 0 });
    }
    const bucket = buckets.get(key);
    bucket.entries.push(e);
    if (e.kind === 'payment') bucket.paid += e.amount;
    else bucket.billed += e.amount;
  }

  const groups = [...buckets.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  if (undated.length > 0) {
    groups.push({
      key: 'imported',
      label: 'นำเข้าจากข้อมูลเก่า',
      entries: undated,
      paid: 0,
      billed: undated.reduce((s, e) => s + e.amount, 0),
    });
  }
  return groups;
}
