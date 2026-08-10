import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney } from '../lib/format.js';
import useLockBodyScroll from '../hooks/useLockBodyScroll.js';

export default function RecordDebtTab({ shopId }) {
  const [prices, setPrices] = useState([]);
  const [bill, setBill] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeChip, setActiveChip] = useState('frequent');
  const [sortBy, setSortBy] = useState('name');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useLockBodyScroll(showAddItem);

  async function loadAll() {
    const [priceList, openBill] = await Promise.all([api.getShopPrices(shopId), api.getOpenBill(shopId)]);
    setPrices(priceList);
    setBill(openBill);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const hasFrequent = prices.some((p) => p.timesUsed > 0);
  const categories = useMemo(
    () => [...new Set(prices.map((p) => p.category).filter(Boolean))],
    [prices]
  );

  useEffect(() => {
    if (!hasFrequent && activeChip === 'frequent') setActiveChip('all');
  }, [hasFrequent, activeChip]);

  const qtyByItem = useMemo(() => {
    const map = new Map();
    for (const e of bill?.entries ?? []) map.set(e.itemId, e);
    return map;
  }, [bill]);

  const visibleItems = useMemo(() => {
    if (activeChip === 'frequent') {
      return [...prices].filter((p) => p.timesUsed > 0).sort((a, b) => b.timesUsed - a.timesUsed);
    }
    const list = activeChip === 'all' ? [...prices] : prices.filter((p) => p.category === activeChip);
    if (sortBy === 'price') {
      return list.sort((a, b) => a.effectivePrice - b.effectivePrice);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [prices, activeChip, sortBy]);

  async function changeQty(itemId, delta) {
    setBusy(true);
    try {
      const updated = await api.addBillEntry(shopId, itemId, delta);
      setBill(updated);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    setError('');
    const name = newItem.name.trim();
    const price = Number(newItem.price);
    if (!name || !Number.isFinite(price) || price < 0) {
      setError('กรอกชื่อและราคาที่ถูกต้อง');
      return;
    }
    try {
      await api.createItem(name, price, newItem.category.trim() || undefined);
      setNewItem({ name: '', price: '', category: '' });
      setShowAddItem(false);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!bill) return <p className="empty-state" style={{ padding: 20 }}>กำลังโหลด...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="section-pad" style={{ paddingBottom: 0 }}>
        <div className="chip-row">
          <button className={`chip ${activeChip === 'all' ? 'active' : ''}`} onClick={() => setActiveChip('all')}>
            ทั้งหมด
          </button>
          {hasFrequent && (
            <button className={`chip ${activeChip === 'frequent' ? 'active' : ''}`} onClick={() => setActiveChip('frequent')}>
              ใช้บ่อย
            </button>
          )}
          {categories.map((c) => (
            <button key={c} className={`chip ${activeChip === c ? 'active' : ''}`} onClick={() => setActiveChip(c)}>
              {c}
            </button>
          ))}
        </div>
        {activeChip !== 'frequent' && (
          <div className="sort-row">
            <span className="sort-label">เรียงตาม</span>
            <button className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`} onClick={() => setSortBy('name')}>
              ชื่อ ก-ฮ
            </button>
            <button className={`sort-btn ${sortBy === 'price' ? 'active' : ''}`} onClick={() => setSortBy('price')}>
              ราคา
            </button>
          </div>
        )}
      </div>

      <div className="section-pad" style={{ paddingTop: 12 }}>
        <div className="item-grid">
          {visibleItems.map((item) => {
            const entry = qtyByItem.get(item.id);
            const qty = entry?.quantity ?? 0;
            return (
              <div key={item.id} className={`item-tile ${qty > 0 ? 'active' : ''}`}>
                {qty > 0 && <div className="tile-badge">{qty}</div>}
                <div className="tile-name">{item.name}</div>
                <div className="tile-price tabular">{item.effectivePrice} บาท</div>
                {qty > 0 ? (
                  <div className="tile-stepper">
                    <button className="minus" disabled={busy} onClick={() => changeQty(item.id, -1)}>
                      −
                    </button>
                    <span className="qty tabular">{qty}</span>
                    <button className="plus" disabled={busy} onClick={() => changeQty(item.id, 1)}>
                      +
                    </button>
                  </div>
                ) : (
                  <button className="add-tile" disabled={busy} onClick={() => changeQty(item.id, 1)}>
                    +
                  </button>
                )}
              </div>
            );
          })}
          <button className="add-item-tile" onClick={() => setShowAddItem(true)}>
            <span style={{ fontSize: 20 }}>+</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>สินค้าใหม่</span>
          </button>
        </div>
        <div className="hint-text" style={{ marginTop: 10 }}>กดปุ่ม −/+ เพื่อปรับจำนวนได้เลย</div>
        {bill.entries.length > 0 && (
          <div style={{ height: 'calc(96px + env(safe-area-inset-bottom))' }} />
        )}
      </div>

      {bill.entries.length > 0 && (
        <div className="cart-bar">
          <div>
            <div className="cart-label">
              บิลปัจจุบัน · {bill.entries.reduce((s, e) => s + e.quantity, 0)} ชิ้น
            </div>
            <div className="cart-amount tabular">{formatMoney(bill.total)} บาท</div>
          </div>
          <button className="cart-btn" onClick={() => navigate(`/shops/${shopId}/bill`)}>
            ดูบิล<span>›</span>
          </button>
        </div>
      )}

      {showAddItem && (
        <div className="modal-backdrop" onClick={() => setShowAddItem(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="serif">เพิ่มสินค้าใหม่</h2>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="field-input"
                placeholder="ชื่อสินค้า"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
              <input
                className="field-input"
                type="number"
                placeholder="ราคากลาง"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              />
              <input
                className="field-input"
                placeholder="หมวดหมู่ (ไม่บังคับ)"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              />
              {categories.length > 0 && (
                <div className="chip-row">
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`chip ${newItem.category === c ? 'active' : ''}`}
                      onClick={() => setNewItem({ ...newItem, category: c })}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {error && <p style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline-gold" onClick={() => setShowAddItem(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-dark">
                  เพิ่มสินค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
