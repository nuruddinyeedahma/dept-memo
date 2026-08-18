import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi as api } from '../adminApi.js';
import Loader from '../components/Loader.jsx';

export default function AdminCategoriesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [targetCategory, setTargetCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const list = await api.getItems();
    setItems(list);
  }

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => [...new Set((items ?? []).map((i) => i.category).filter(Boolean))].sort(), [items]);

  const visible = useMemo(
    () => (items ?? []).filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase())),
    [items, search]
  );

  const allSelected = visible.length > 0 && visible.every((i) => selected.has(i.id));

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const i of visible) next.delete(i.id);
      } else {
        for (const i of visible) next.add(i.id);
      }
      return next;
    });
  }

  async function handleApply() {
    if (selected.size === 0 || !targetCategory.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.bulkSetItemCategory([...selected], targetCategory.trim());
      setSelected(new Set());
      setTargetCategory('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <div className="light-header">
        <div className="dark-header-top" style={{ padding: 0 }}>
          <button className="icon-btn" onClick={() => navigate('/admin/items')}>
            ←
          </button>
          <div className="shop-title">จัดการหมวดหมู่</div>
          <span style={{ width: 36 }} />
        </div>
      </div>

      <div className="section-pad">
        <div className="search-box">
          <span style={{ color: 'var(--muted-faint)' }}>⌕</span>
          <input placeholder="ค้นหาสินค้า" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {items === null ? (
          <Loader />
        ) : (
          <>
            <div className="pay-section-header">
              <span>สินค้าทั้งหมด {visible.length} รายการ</span>
              <button onClick={toggleSelectAll}>{allSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}</button>
            </div>
            <div className="pay-list" style={{ maxHeight: '40vh' }}>
              {visible.map((item) => (
                <label className="pay-row" key={item.id}>
                  <span className="checkbox-wrap">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={selected.has(item.id)}
                      onChange={() => toggle(item.id)}
                    />
                    <span className="check-visual" />
                  </span>
                  <div className="pay-row-info">
                    <div className="pay-row-date">{item.name}</div>
                    <div className="pay-row-sub">{item.category || 'ไม่มีหมวดหมู่'}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="hint-text" style={{ textAlign: 'left' }}>
              เลือกสินค้าแล้วเลือกหรือพิมพ์หมวดหมู่ที่ต้องการตั้งให้ทั้งหมด
            </div>
            <input
              className="field-input"
              placeholder="หมวดหมู่ใหม่"
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
            />
            {categories.length > 0 && (
              <div className="chip-row">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip ${targetCategory === c ? 'active' : ''}`}
                    onClick={() => setTargetCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="shake" style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}

            <button
              className="btn btn-dark"
              disabled={busy || selected.size === 0 || !targetCategory.trim()}
              onClick={handleApply}
            >
              {busy ? 'กำลังบันทึก...' : `ตั้งหมวดหมู่ให้ ${selected.size} รายการ`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
