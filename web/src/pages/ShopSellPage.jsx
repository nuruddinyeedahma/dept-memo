import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../shopApi.js';
import { formatMoney } from '../lib/format.js';
import Loader from '../components/Loader.jsx';

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

  useEffect(() => {
    setLoading(true);
    shopApi.getItems().then(setItems).finally(() => setLoading(false));
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
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
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
            </div>
          </>
        )}

        <div className="totals-box">
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
    </div>
  );
}
