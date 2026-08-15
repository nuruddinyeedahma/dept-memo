import { useEffect, useState } from 'react';
import { adminApi } from '../adminApi.js';
import { formatMoney } from '../lib/format.js';
import AdminNav from '../components/AdminNav.jsx';
import useLockBodyScroll from '../hooks/useLockBodyScroll.js';

export default function AdminShopsPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  useLockBodyScroll(showModal);

  async function load() {
    setLoading(true);
    try {
      setShops(await adminApi.getShops());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible = shops.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()));

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await adminApi.createShop(newName.trim());
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
      <div className="light-header">
        <div className="shop-title">ร้านค้า (แอดมิน)</div>
      </div>

      <div className="section-pad">
        <div className="search-box">
          <span style={{ color: 'var(--muted-faint)' }}>⌕</span>
          <input placeholder="ค้นหาชื่อร้าน" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <p className="empty-state">กำลังโหลด...</p>
        ) : visible.length === 0 ? (
          <p className="empty-state">ไม่พบร้าน</p>
        ) : (
          <div className="shop-list-panel">
            {visible.map((shop) => (
              <div className="shop-row" key={shop.id} style={{ cursor: 'default' }}>
                <div>
                  <div className="shop-row-name">{shop.name}</div>
                  {shop.pendingBillTotal > 0 && (
                    <div className="shop-row-pending">บิลค้างบันทึก {formatMoney(shop.pendingBillTotal)} บาท</div>
                  )}
                </div>
                <div className="shop-row-amount tabular">{formatMoney(shop.outstandingDebt)} บาท</div>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-outline-gold" onClick={() => setShowModal(true)}>
          + เพิ่มร้าน
        </button>
      </div>

      <div style={{ flex: 1 }} />
      <AdminNav />

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
