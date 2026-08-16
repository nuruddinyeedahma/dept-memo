import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../shopApi.js';
import { formatMoney } from '../lib/format.js';
import Loader from '../components/Loader.jsx';

// Real clips (trimmed to cut the dead air at both ends - freesound.org, community
// license), preloaded once so playback starts the instant they're triggered.
const doorChimeAudio = new Audio('/sounds/door-chime.mp3');
const cashRegisterAudio = new Audio('/sounds/cash-register.mp3');
doorChimeAudio.preload = 'auto';
cashRegisterAudio.preload = 'auto';

function playClip(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Autoplay can be blocked before the user has interacted with the page - fine, skip.
  });
}

export default function ShopSellPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState(new Map());
  const [amountReceived, setAmountReceived] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [activeChip, setActiveChip] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });
  const [addItemError, setAddItemError] = useState('');
  const checkoutRef = useRef(null);

  function loadItems() {
    setLoading(true);
    return shopApi.getItems().then(setItems).finally(() => setLoading(false));
  }

  useEffect(() => {
    loadItems();
    playClip(doorChimeAudio);
  }, []);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))], [items]);

  const visibleItems = useMemo(() => {
    const list = activeChip === 'all' ? [...items] : items.filter((i) => i.category === activeChip);
    if (sortBy === 'price') return list.sort((a, b) => a.price - b.price);
    return list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [items, activeChip, sortBy]);

  function changeQty(item, delta) {
    setSaved(false);
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      const qty = (existing?.quantity ?? 0) + delta;
      if (qty <= 0) next.delete(item.id);
      else next.set(item.id, { itemId: item.id, itemName: item.name, unitPrice: item.price, quantity: qty });
      return next;
    });
  }

  const cartEntries = useMemo(() => [...cart.values()], [cart]);
  const cartQty = useMemo(() => cartEntries.reduce((s, e) => s + e.quantity, 0), [cartEntries]);
  const total = useMemo(() => cartEntries.reduce((s, e) => s + e.unitPrice * e.quantity, 0), [cartEntries]);
  const received = Number(amountReceived) || 0;
  const change = Math.max(0, received - total);
  const customerOwed = Math.max(0, total - received);

  async function handleSave() {
    setError('');
    if (cartEntries.length === 0) {
      setError('เลือกสินค้าอย่างน้อย 1 รายการ');
      return;
    }
    setBusy(true);
    try {
      await shopApi.createSale({ items: cartEntries, amountReceived: received });
      setCart(new Map());
      setAmountReceived('');
      setSaved(true);
      playClip(cashRegisterAudio);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    setAddItemError('');
    const name = newItem.name.trim();
    const price = Number(newItem.price);
    if (!name || !Number.isFinite(price) || price < 0) {
      setAddItemError('กรอกชื่อและราคาที่ถูกต้อง');
      return;
    }
    try {
      await shopApi.createItem(name, price, newItem.category.trim() || undefined);
      setNewItem({ name: '', price: '', category: '' });
      setShowAddItem(false);
      loadItems();
    } catch (err) {
      setAddItemError(err.message);
    }
  }

  return (
    <div className="app">
      <div className="light-header">
        <div className="back-row">
          <button className="back-arrow" onClick={() => navigate('/shop')}>
            ←
          </button>
          <div className="shop-title">สร้างรายการขาย</div>
        </div>
      </div>

      <div className="section-pad">
        {loading ? (
          <Loader />
        ) : (
          <>
            <div className="chip-row">
              <button className={`chip ${activeChip === 'all' ? 'active' : ''}`} onClick={() => setActiveChip('all')}>
                ทั้งหมด
              </button>
              {categories.map((c) => (
                <button key={c} className={`chip ${activeChip === c ? 'active' : ''}`} onClick={() => setActiveChip(c)}>
                  {c}
                </button>
              ))}
            </div>
            <div className="sort-row">
              <span className="sort-label">เรียงตาม</span>
              <button className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`} onClick={() => setSortBy('name')}>
                ชื่อ ก-ฮ
              </button>
              <button className={`sort-btn ${sortBy === 'price' ? 'active' : ''}`} onClick={() => setSortBy('price')}>
                ราคา
              </button>
            </div>

            <div className="item-grid">
              {visibleItems.map((item) => {
                const qty = cart.get(item.id)?.quantity ?? 0;
                return (
                  <div key={item.id} className={`item-tile ${qty > 0 ? 'active' : ''}`}>
                    {qty > 0 && <div className="tile-badge">{qty}</div>}
                    <div className="tile-name">{item.name}</div>
                    <div className="tile-price tabular">{item.price} บาท</div>
                    {qty > 0 ? (
                      <div className="tile-stepper">
                        <button className="minus" onClick={() => changeQty(item, -1)}>
                          −
                        </button>
                        <span className="qty tabular">{qty}</span>
                        <button className="plus" onClick={() => changeQty(item, 1)}>
                          +
                        </button>
                      </div>
                    ) : (
                      <button className="add-tile" onClick={() => changeQty(item, 1)}>
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
            {cartEntries.length > 0 && <div style={{ height: 'calc(80px + env(safe-area-inset-bottom))' }} />}
          </>
        )}

        <div ref={checkoutRef} className="totals-box">
          <div className="totals-row grand">
            <span className="label">ยอดรวม</span>
            <span className="value tabular">{formatMoney(total)} บาท</span>
          </div>
          <div className="field-group">
            <div className="field-label">รับเงินมา</div>
            <input
              className="field-input"
              type="number"
              value={amountReceived}
              onChange={(e) => {
                setSaved(false);
                setAmountReceived(e.target.value);
              }}
            />
          </div>
          <div className="totals-row">
            <span>เงินทอน</span>
            <span className="value tabular">{formatMoney(change)} บาท</span>
          </div>
          {customerOwed > 0 && (
            <div className="totals-row">
              <span>ลูกค้าค้าง</span>
              <span className="value tabular" style={{ color: 'var(--debt-red)' }}>
                {formatMoney(customerOwed)} บาท
              </span>
            </div>
          )}
        </div>

        {error && <p style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}
        {saved && <p style={{ color: 'var(--gold-soft)', fontSize: 13, margin: 0 }}>✓ บันทึกรายการขายแล้ว</p>}
        <button className="btn btn-dark" disabled={busy || cartEntries.length === 0} onClick={handleSave}>
          บันทึกการขาย
        </button>
      </div>

      {cartEntries.length > 0 && (
        <div className="cart-bar">
          <div>
            <div className="cart-label">ยอดขาย · {cartQty} ชิ้น</div>
            <div className="cart-amount tabular">{formatMoney(total)} บาท</div>
          </div>
          <button className="cart-btn" onClick={() => checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            คิดเงิน<span>›</span>
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
                placeholder="ราคาของร้านนี้"
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
              {addItemError && <p style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{addItemError}</p>}
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
