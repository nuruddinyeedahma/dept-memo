import { useEffect, useMemo, useState } from 'react';
import { adminApi as api } from '../adminApi.js';
import useLockBodyScroll from '../hooks/useLockBodyScroll.js';
import Loader from './Loader.jsx';

export default function ShopItemsBulkSheet({ shopId, shopName, onClose, onSaved }) {
  useLockBodyScroll();
  const [items, setItems] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getItems().then((list) => {
      setItems(list);
      setSelected(new Set(list.filter((i) => i.isGlobal || i.shopIds.includes(shopId)).map((i) => i.id)));
    });
  }, [shopId]);

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

  async function handleSave() {
    setBusy(true);
    setError('');
    try {
      await api.bulkSetShopItems(shopId, [...selected]);
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div>
          <div className="sheet-title">เลือกสินค้า · {shopName}</div>
          <div style={{ fontSize: 13, color: 'var(--muted-soft)', marginTop: 4 }}>
            เลือกสินค้าที่ร้านนี้ขาย สินค้าที่ไม่เลือกจะไม่แสดงในหน้าบันทึกหนี้/ราคาของร้านนี้
          </div>
        </div>

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
            <div className="pay-list" style={{ maxHeight: '46vh' }}>
              {visible.map((item) => (
                <label className="pay-row" key={item.id}>
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                  <div className="pay-row-info">
                    <div className="pay-row-date">{item.name}</div>
                    <div className="pay-row-sub">
                      {item.defaultPrice} บาท{item.category ? ` · ${item.category}` : ''}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </>
        )}

        {error && <p style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}

        <div className="modal-actions" style={{ justifyContent: 'stretch' }}>
          <button className="btn btn-outline-gold" style={{ flex: 1 }} onClick={onClose} disabled={busy}>
            ยกเลิก
          </button>
          <button className="btn btn-dark" style={{ flex: 1 }} onClick={handleSave} disabled={busy || items === null}>
            {busy ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}
