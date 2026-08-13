import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import BottomNav from '../components/BottomNav.jsx';
import ItemSheet from '../components/ItemSheet.jsx';
import ShopItemsBulkSheet from '../components/ShopItemsBulkSheet.jsx';
import useLockBodyScroll from '../hooks/useLockBodyScroll.js';

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [bulkShop, setBulkShop] = useState(null);
  const [showShopPicker, setShowShopPicker] = useState(false);
  useLockBodyScroll(showAdd || showShopPicker);

  async function load() {
    setLoading(true);
    try {
      const [itemList, shopList] = await Promise.all([api.getItems(), api.getShops()]);
      setItems(itemList);
      setShops(shopList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase())),
    [items, search]
  );
  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))], [items]);

  function shopLabel(item) {
    if (item.isGlobal) return 'ทุกร้าน';
    if (item.shopIds.length === 1) {
      const shop = shops.find((s) => s.id === item.shopIds[0]);
      return shop ? shop.name : '1 ร้าน';
    }
    return `${item.shopIds.length} ร้าน`;
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
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app">
      <div className="light-header">
        <div className="shop-title">จัดการสินค้า</div>
      </div>

      <div className="section-pad">
        <div className="search-box">
          <span style={{ color: 'var(--muted-faint)' }}>⌕</span>
          <input placeholder="ค้นหาสินค้า" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="hint-text" style={{ textAlign: 'left' }}>
          แตะรายการเพื่อแก้ไขราคากลางหรือเลือกร้านที่ผูกไว้
        </div>

        {loading ? (
          <p className="empty-state">กำลังโหลด...</p>
        ) : visible.length === 0 ? (
          <p className="empty-state">ไม่พบสินค้า</p>
        ) : (
          <div className="price-panel">
            {visible.map((item) => (
              <button
                key={item.id}
                className={`price-row item-manage-row ${item.active ? '' : 'inactive'}`}
                onClick={() => setEditItem(item)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="price-row-name">{item.name}</div>
                  <div className="price-row-default tabular">
                    ราคากลาง {item.defaultPrice} บาท{item.category ? ` · ${item.category}` : ''}
                  </div>
                </div>
                {!item.active && <span className="override-badge inactive-badge">ปิดใช้งาน</span>}
                <span className={`override-badge ${item.isGlobal ? '' : 'scoped'}`}>{shopLabel(item)}</span>
              </button>
            ))}
          </div>
        )}

        <button className="btn btn-outline-gold" onClick={() => setShowAdd(true)}>
          + เพิ่มสินค้าใหม่
        </button>
        <button className="btn btn-outline-gold" onClick={() => setShowShopPicker(true)}>
          เลือกสินค้ารายร้านแบบ bulk
        </button>
      </div>

      <div style={{ flex: 1 }} />
      <BottomNav />

      {editItem && (
        <ItemSheet
          item={editItem}
          shops={shops}
          categories={categories}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            setEditItem(null);
            load();
          }}
          onDeleted={() => {
            setEditItem(null);
            load();
          }}
        />
      )}

      {showShopPicker && (
        <div className="modal-backdrop" onClick={() => setShowShopPicker(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="serif">เลือกร้าน</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>เลือกร้านที่จะจัดการสินค้าแบบ bulk</p>
            <div className="pay-list" style={{ maxHeight: '50vh' }}>
              {shops.map((shop) => (
                <button
                  key={shop.id}
                  className="pay-row item-manage-row"
                  onClick={() => {
                    setBulkShop(shop);
                    setShowShopPicker(false);
                  }}
                >
                  <div className="pay-row-info">
                    <div className="pay-row-date">{shop.name}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline-gold" onClick={() => setShowShopPicker(false)}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkShop && (
        <ShopItemsBulkSheet
          shopId={bulkShop.id}
          shopName={bulkShop.name}
          onClose={() => setBulkShop(null)}
          onSaved={() => {
            setBulkShop(null);
            load();
          }}
        />
      )}

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
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
                <button type="button" className="btn btn-outline-gold" onClick={() => setShowAdd(false)}>
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
