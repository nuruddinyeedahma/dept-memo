import { useState } from 'react';
import { api } from '../api.js';

export default function ItemSheet({ item, shops, onClose, onSaved }) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.defaultPrice));
  const [category, setCategory] = useState(item.category ?? '');
  const [isGlobal, setIsGlobal] = useState(item.isGlobal);
  const [selected, setSelected] = useState(new Set(item.shopIds));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function toggleShop(id) {
    setIsGlobal(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setBusy(true);
    setError('');
    try {
      const priceValue = Number(price);
      if (!name.trim() || !Number.isFinite(priceValue) || priceValue < 0) {
        throw new Error('กรอกชื่อและราคาที่ถูกต้อง');
      }
      await api.updateItem(item.id, { name: name.trim(), default_price: priceValue, category: category.trim() });
      await api.setItemShops(item.id, isGlobal ? [] : [...selected]);
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
        <div className="sheet-title">แก้ไขสินค้า</div>

        <div className="field-group">
          <div className="field-label">ชื่อสินค้า</div>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field-group">
          <div className="field-label">ราคากลาง</div>
          <input className="field-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="field-group">
          <div className="field-label">หมวดหมู่ (ไม่บังคับ)</div>
          <input className="field-input" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>

        <div className="field-group">
          <div className="field-label">ผูกกับร้าน</div>
          <button
            type="button"
            className={`chip ${isGlobal ? 'active' : ''}`}
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              setIsGlobal(true);
              setSelected(new Set());
            }}
          >
            ทุกร้าน
          </button>
          <div className="shop-check-list">
            {shops.map((shop) => (
              <label className="pay-row" key={shop.id}>
                <input type="checkbox" checked={!isGlobal && selected.has(shop.id)} onChange={() => toggleShop(shop.id)} />
                <div className="pay-row-info">
                  <div className="pay-row-date">{shop.name}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}

        <div className="modal-actions" style={{ justifyContent: 'stretch' }}>
          <button className="btn btn-outline-gold" style={{ flex: 1 }} onClick={onClose} disabled={busy}>
            ยกเลิก
          </button>
          <button className="btn btn-dark" style={{ flex: 1 }} onClick={handleSave} disabled={busy}>
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
