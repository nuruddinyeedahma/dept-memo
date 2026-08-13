import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney, formatRelativeThai } from '../lib/format.js';
import BottomNav from '../components/BottomNav.jsx';
import useLockBodyScroll from '../hooks/useLockBodyScroll.js';

const SORTS = [
  { key: 'debt', label: 'ค้างมากสุด' },
  { key: 'recent', label: 'ล่าสุด' },
  { key: 'alpha', label: 'ก–ฮ' },
];

function shopSubtitle(shop) {
  if (shop.outstandingDebt === 0) {
    if (!shop.lastActivityAt) return 'ยังไม่มีรายการ';
    return `เคลียร์ครบเมื่อ ${formatRelativeThai(shop.lastActivityAt)}`;
  }
  if (!shop.lastActivityAt) return 'ยังไม่มีรายการ';
  if (shop.lastActivityKind === 'payment') {
    return `จ่ายบางส่วน${formatRelativeThai(shop.lastActivityAt)} ${formatMoney(shop.lastActivityAmount)} บาท`;
  }
  return `ลงบิลล่าสุด${formatRelativeThai(shop.lastActivityAt)} · ${shop.lastActivityEntryCount} รายการ`;
}

export default function ShopList() {
  const [shops, setShops] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('debt');
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useLockBodyScroll(showModal);

  async function load() {
    setLoading(true);
    try {
      const [shopList, summaryData] = await Promise.all([api.getShops(), api.getSummary()]);
      setShops(shopList);
      setSummary(summaryData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const maxDebt = useMemo(() => Math.max(1, ...shops.map((s) => s.outstandingDebt)), [shops]);

  const visibleShops = useMemo(() => {
    let list = shops.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()));
    if (sort === 'debt') {
      list = [...list].sort((a, b) => b.outstandingDebt - a.outstandingDebt);
    } else if (sort === 'recent') {
      list = [...list].sort((a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''));
    } else {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }
    return list;
  }, [shops, search, sort]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.createShop(newName.trim());
      setNewName('');
      setShowModal(false);
      setError('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app">
      <div className="dark-header">
        <div className="dark-header-top">
          <div>
            <div className="eyebrow">ยอดหนี้ค้างทั้งหมด</div>
            <div className="amount serif">
              {loading ? '···' : formatMoney(summary?.totalOutstanding)}
              <span className="unit">บาท</span>
            </div>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-item">
            <div className="stat-label">ร้านค้างชำระ</div>
            <div className="stat-value tabular">
              {summary ? `${summary.shopsWithDebt} / ${summary.totalShops} ร้าน` : '···'}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">รับชำระเดือนนี้</div>
            <div className="stat-value tabular positive">+ {summary ? formatMoney(summary.paymentsThisMonth) : '···'}</div>
          </div>
        </div>
        {summary?.totalPendingBills > 0 && (
          <div className="pending-hint">
            มีบิลที่ยังไม่ได้บันทึกลงหนี้ {formatMoney(summary.totalPendingBills)} บาท ในทุกร้านรวมกัน
          </div>
        )}
      </div>

      <div className="section-pad">
        <div className="search-box">
          <span style={{ color: 'var(--muted-faint)' }}>⌕</span>
          <input placeholder="ค้นหาชื่อร้าน" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="chip-row">
          {SORTS.map((s) => (
            <button key={s.key} className={`chip ${sort === s.key ? 'active' : ''}`} onClick={() => setSort(s.key)}>
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="empty-state">กำลังโหลด...</p>
        ) : visibleShops.length === 0 ? (
          <p className="empty-state">ไม่พบร้านที่ค้นหา ลองกด "+ เพิ่มร้าน" เพื่อเริ่มต้น</p>
        ) : (
          <div className="shop-list-panel">
            {visibleShops.map((shop) => (
              <button key={shop.id} className="shop-row" onClick={() => navigate(`/shops/${shop.id}`)}>
                <div>
                  <div className={`shop-row-name ${shop.outstandingDebt === 0 ? 'settled' : ''}`}>{shop.name}</div>
                  <div className="shop-row-sub">{shopSubtitle(shop)}</div>
                  {shop.pendingBillTotal > 0 && (
                    <div className="shop-row-pending">บิลค้างบันทึก {formatMoney(shop.pendingBillTotal)} บาท</div>
                  )}
                </div>
                {shop.outstandingDebt === 0 ? (
                  <div className="shop-row-settled">ไม่มีหนี้ค้าง</div>
                ) : (
                  <div>
                    <div className="shop-row-amount tabular">{formatMoney(shop.outstandingDebt)}</div>
                    <div
                      className="debt-bar"
                      style={{
                        width: `${Math.max(8, (shop.outstandingDebt / maxDebt) * 56)}px`,
                        background: shop.outstandingDebt >= maxDebt * 0.5 ? 'var(--debt-red)' : '#C08A56',
                      }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setShowModal(true)}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>เพิ่มร้าน
      </button>

      <div style={{ flex: 1 }} />
      <BottomNav />

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="serif">เพิ่มร้านใหม่</h2>
            <form onSubmit={handleAdd}>
              <input
                className="field-input"
                autoFocus
                placeholder="ชื่อร้าน"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ margin: '10px 0 16px' }}
              />
              {error && <p style={{ color: 'var(--debt-red)', fontSize: 13, marginTop: -10 }}>{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline-gold" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-dark">
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
