import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney } from '../lib/format.js';
import Loader from '../components/Loader.jsx';

export default function BillEditPage() {
  const { id: shopId, billId } = useParams();
  const navigate = useNavigate();
  const [prices, setPrices] = useState([]);
  const [cart, setCart] = useState(new Map());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [notEditable, setNotEditable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeChip, setActiveChip] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });
  const [addItemError, setAddItemError] = useState('');

  function loadPrices() {
    return api.getShopPrices(shopId).then(setPrices);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getShopPrices(shopId), api.getBill(billId)])
      .then(([priceList, bill]) => {
        if (bill.status !== 'cleared' || bill.paymentId) {
          setNotEditable(true);
          return;
        }
        setPrices(priceList);
        setCart(
          new Map(
            bill.entries
              .filter((e) => e.itemId)
              .map((e) => [String(e.itemId), { itemId: e.itemId, itemName: e.itemName, unitPrice: e.unitPrice, quantity: e.quantity }])
          )
        );
        setNote(bill.note || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [shopId, billId]);

  const categories = useMemo(() => [...new Set(prices.map((p) => p.category).filter(Boolean))], [prices]);

  const visibleItems = useMemo(() => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const list = prices.filter((p) => p.name.toLowerCase().includes(q));
      if (sortBy === 'price') return list.sort((a, b) => a.effectivePrice - b.effectivePrice);
      return list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }
    const list = activeChip === 'all' ? [...prices] : prices.filter((p) => p.category === activeChip);
    if (sortBy === 'price') return list.sort((a, b) => a.effectivePrice - b.effectivePrice);
    return list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [prices, activeChip, sortBy, search]);

  function changeQty(item, delta) {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      const qty = (existing?.quantity ?? 0) + delta;
      if (qty <= 0) next.delete(item.id);
      else next.set(item.id, { itemId: item.id, itemName: item.name, unitPrice: item.effectivePrice, quantity: qty });
      return next;
    });
  }

  const cartEntries = useMemo(() => [...cart.values()], [cart]);
  const total = useMemo(() => cartEntries.reduce((s, e) => s + e.unitPrice * e.quantity, 0), [cartEntries]);

  async function handleSave() {
    setError('');
    if (cartEntries.length === 0) {
      setError('บิลต้องมีอย่างน้อย 1 รายการ');
      return;
    }
    setBusy(true);
    try {
      await api.updateBill(billId, { entries: cartEntries, note: note.trim() || undefined });
      navigate(`/shops/${shopId}`);
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
      await api.createItem(name, price, newItem.category.trim() || undefined, shopId);
      setNewItem({ name: '', price: '', category: '' });
      setShowAddItem(false);
      loadPrices();
    } catch (err) {
      setAddItemError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="app">
        <Loader />
      </div>
    );
  }

  if (notEditable) {
    return (
      <div className="app">
        <div className="light-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="back-arrow" onClick={() => navigate(`/shops/${shopId}`)}>
            ←
          </button>
          <div className="shop-title" style={{ fontSize: 17 }}>แก้ไขบิล</div>
        </div>
        <div className="section-pad">
          <p className="empty-state">บิลนี้ชำระแล้วหรือไม่สามารถแก้ไขได้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="light-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="back-arrow" onClick={() => navigate(`/shops/${shopId}`)}>
          ←
        </button>
        <div className="shop-title" style={{ fontSize: 17 }}>แก้ไขบิล</div>
        <span style={{ width: 24 }} />
      </div>

      <div className="section-pad">
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
          {!search && (
            <>
              <span className="sort-label">เรียงตาม</span>
              <button className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`} onClick={() => setSortBy('name')}>
                ชื่อ ก-ฮ
              </button>
              <button className={`sort-btn ${sortBy === 'price' ? 'active' : ''}`} onClick={() => setSortBy('price')}>
                ราคา
              </button>
            </>
          )}
          <button
            type="button"
            className="icon-btn-light"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              setShowSearch((s) => !s);
              setSearch('');
            }}
          >
            ⌕
          </button>
        </div>
        {showSearch && (
          <div className="search-box" style={{ marginTop: 10 }}>
            <span style={{ color: 'var(--muted-faint)' }}>⌕</span>
            <input autoFocus placeholder="ค้นหาสินค้า" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}

        <div className="item-grid" style={{ marginTop: 12 }}>
          {visibleItems.map((item) => {
            const qty = cart.get(item.id)?.quantity ?? 0;
            return (
              <div key={item.id} className={`item-tile ${qty > 0 ? 'active' : ''}`}>
                {qty > 0 && <div className="tile-badge">{qty}</div>}
                <div className="tile-name">{item.name}</div>
                <div className="tile-price tabular">{item.effectivePrice} บาท</div>
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

        <div className="notes-box">
          <div className="notes-label">หมายเหตุในบิล</div>
          <textarea
            placeholder="เช่น รับของวันศุกร์ นัดชำระสิ้นเดือน"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="totals-box">
          <div className="totals-row grand">
            <span className="label">ยอดบิลนี้</span>
            <span className="value tabular">{formatMoney(total)} บาท</span>
          </div>
        </div>

        {error && <p className="shake" style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}
        <button className="btn btn-dark" disabled={busy || cartEntries.length === 0} onClick={handleSave}>
          บันทึกการแก้ไข
        </button>
      </div>

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
              {addItemError && <p className="shake" style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{addItemError}</p>}
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
