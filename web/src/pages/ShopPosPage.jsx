import { useEffect, useMemo, useState } from 'react';
import { shopApi } from '../shopApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney, formatDateTimeThai } from '../lib/format.js';

export default function ShopPosPage() {
  const { user, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [cart, setCart] = useState(new Map());
  const [amountReceived, setAmountReceived] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [itemList, saleList] = await Promise.all([shopApi.getItems(), shopApi.getSales()]);
      setItems(itemList);
      setSales(saleList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function changeQty(item, delta) {
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
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <div className="light-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="shop-title">{user?.displayName || 'ขายของ'}</div>
        <button className="btn-danger-text" onClick={logout}>
          ออกจากระบบ
        </button>
      </div>

      <div className="section-pad">
        {loading ? (
          <p className="empty-state">กำลังโหลด...</p>
        ) : (
          <div className="item-grid">
            {items.map((item) => {
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
              onChange={(e) => setAmountReceived(e.target.value)}
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
        <button className="btn btn-dark" disabled={busy || cartEntries.length === 0} onClick={handleSave}>
          บันทึกการขาย
        </button>

        {sales.length > 0 && (
          <>
            <div className="add-item-card-title" style={{ marginTop: 10 }}>
              รายการขายล่าสุด
            </div>
            <div className="price-panel">
              {sales.slice(0, 20).map((sale) => (
                <div className="price-row" key={sale._id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="price-row-name">{formatDateTimeThai(sale.createdAt)}</div>
                    <div className="price-row-default tabular">
                      {sale.items.length} รายการ{sale.customerOwed > 0 ? ` · ค้าง ${formatMoney(sale.customerOwed)} บาท` : ''}
                    </div>
                  </div>
                  <div className="shop-row-amount tabular">{formatMoney(sale.total)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
