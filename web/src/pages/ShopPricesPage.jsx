import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../shopApi.js';
import Loader from '../components/Loader.jsx';

export default function ShopPricesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState('');
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });
  const [error, setError] = useState('');

  async function load() {
    const list = await shopApi.getItems();
    setItems(list);
    const d = {};
    for (const item of list) d[item.id] = item.isOverride ? String(item.price) : '';
    setDrafts(d);
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () => (items ?? []).filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase())),
    [items, search]
  );
  const categories = useMemo(() => [...new Set((items ?? []).map((i) => i.category).filter(Boolean))], [items]);

  async function saveOverride(itemId) {
    const raw = drafts[itemId];
    if (raw === '' || raw === undefined) {
      await shopApi.clearPrice(itemId);
    } else {
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) return;
      await shopApi.setPrice(itemId, value);
    }
    load();
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
      await shopApi.createItem(name, price, newItem.category.trim() || undefined);
      setNewItem({ name: '', price: '', category: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app">
      <div className="light-header">
        <div className="back-row">
          <button className="back-arrow" onClick={() => navigate('/shop')}>
            ←
          </button>
          <div className="shop-title">จัดการราคา</div>
        </div>
      </div>

      {items === null ? (
        <Loader />
      ) : (
        <div className="section-pad">
          <div className="search-box">
            <span style={{ color: 'var(--muted-faint)' }}>⌕</span>
            <input placeholder="ค้นหาสินค้า" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="hint-text" style={{ textAlign: 'left' }}>
            ใส่ตัวเลขเพื่อตั้งราคาเฉพาะร้านนี้ · เว้นว่างไว้จะใช้ราคากลาง
          </div>

          <div className="price-panel">
            {visible.map((item) => (
              <div className="price-row" key={item.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="price-row-name">
                    {item.name}
                    {item.isOverride && <span className="override-badge" style={{ marginLeft: 6 }}>เฉพาะร้าน</span>}
                  </div>
                  <div className="price-row-default tabular">ราคากลาง {item.defaultPrice} บาท</div>
                </div>
                <input
                  className={`price-input ${!drafts[item.id] ? 'unset' : ''}`}
                  placeholder="ราคากลาง"
                  value={drafts[item.id] ?? ''}
                  onChange={(e) => setDrafts({ ...drafts, [item.id]: e.target.value })}
                  onBlur={() => saveOverride(item.id)}
                />
              </div>
            ))}
          </div>

          <div className="add-item-card">
            <div className="add-item-card-title">เพิ่มสินค้าใหม่</div>
            <form onSubmit={handleAddItem} className="add-item-fields" style={{ flexWrap: 'wrap' }}>
              <input
                name="name"
                placeholder="ชื่อสินค้า"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
              <input
                name="price"
                type="number"
                placeholder="ราคาของร้านนี้"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              />
              <input
                name="category"
                placeholder="หมวดหมู่ (ไม่บังคับ)"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              />
            </form>
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
            {error && <p className="shake" style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}
            <button type="button" className="btn btn-dark" onClick={handleAddItem}>
              เพิ่มสินค้า
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
