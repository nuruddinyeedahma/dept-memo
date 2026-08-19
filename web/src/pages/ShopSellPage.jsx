import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../shopApi.js';
import { formatMoney } from '../lib/format.js';
import Loader from '../components/Loader.jsx';
import useLockBodyScroll from '../hooks/useLockBodyScroll.js';

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

function roundUpTo(n, step) {
  return Math.ceil(n / step) * step;
}

export default function ShopSellPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [existingDebts, setExistingDebts] = useState([]);
  const [cart, setCart] = useState(new Map());
  const [amountReceived, setAmountReceived] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showChangeOverride, setShowChangeOverride] = useState(false);
  const [changeOverrideValue, setChangeOverrideValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [activeChip, setActiveChip] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });
  const [addItemError, setAddItemError] = useState('');
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const checkoutRef = useRef(null);
  useLockBodyScroll(showCustomerPicker || showAddItem);

  function loadItems() {
    setLoading(true);
    return shopApi.getItems().then(setItems).finally(() => setLoading(false));
  }

  useEffect(() => {
    loadItems();
    shopApi.getDebts().then(setExistingDebts);
    playClip(doorChimeAudio);
  }, []);

  // Hide the floating running-total once the checkout section itself is on screen -
  // it would otherwise sit fixed on top of it after "คิดเงิน" scrolls there.
  useEffect(() => {
    if (!checkoutRef.current) return;
    const obs = new IntersectionObserver(([entry]) => setCheckoutVisible(entry.isIntersecting), { threshold: 0.15 });
    obs.observe(checkoutRef.current);
    return () => obs.disconnect();
  }, []);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))], [items]);

  const visibleItems = useMemo(() => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const list = items.filter((i) => i.name.toLowerCase().includes(q));
      if (sortBy === 'price') return list.sort((a, b) => a.price - b.price);
      return list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }
    const list = activeChip === 'all' ? [...items] : items.filter((i) => i.category === activeChip);
    if (sortBy === 'price') return list.sort((a, b) => a.price - b.price);
    return list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [items, activeChip, sortBy, search]);

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
  const cartQty = useMemo(() => cartEntries.reduce((s, e) => s + e.quantity, 0), [cartEntries]);
  const total = useMemo(() => cartEntries.reduce((s, e) => s + e.unitPrice * e.quantity, 0), [cartEntries]);

  const matchedDebt = useMemo(
    () => existingDebts.find((d) => d.customerName.trim().toLowerCase() === customerName.trim().toLowerCase()),
    [existingDebts, customerName]
  );
  const oldOwed = matchedDebt?.totalOwed ?? 0;
  // Picking an existing debtor folds their open balance into today's total, so
  // the cashier collects one combined amount instead of two separate ones.
  const combinedTotal = total + oldOwed;

  const received = Number(amountReceived) || 0;
  const computedChange = Math.max(0, received - combinedTotal);
  const customerOwed = Math.max(0, combinedTotal - received);
  const changeDiffers =
    showChangeOverride && changeOverrideValue !== '' && Number(changeOverrideValue) !== computedChange;
  const effectiveChange = changeDiffers ? Number(changeOverrideValue) : computedChange;
  const needsName = customerOwed > 0 || changeDiffers;

  const customerSuggestions = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return q ? existingDebts.filter((d) => d.customerName.toLowerCase().includes(q)) : existingDebts;
  }, [existingDebts, customerSearch]);

  const quickAmounts = useMemo(() => {
    if (combinedTotal <= 0) return [];
    const seen = new Set();
    const out = [];
    for (const c of [
      combinedTotal,
      roundUpTo(combinedTotal, 5),
      roundUpTo(combinedTotal, 10),
      roundUpTo(combinedTotal, 20),
      roundUpTo(combinedTotal, 50),
      roundUpTo(combinedTotal, 100),
    ]) {
      if (!seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out;
  }, [combinedTotal]);

  async function handleSave() {
    setError('');
    if (cartEntries.length === 0) {
      setError('เลือกสินค้าอย่างน้อย 1 รายการ');
      return;
    }
    if (needsName && !customerName.trim()) {
      setError('ลูกค้ายังไม่จ่ายครบหรือมีการปรับเงินทอน กรุณาใส่ชื่อลูกค้า');
      setShowCustomerPicker(true);
      return;
    }
    setBusy(true);
    try {
      await shopApi.createSale({
        items: cartEntries,
        amountReceived: received,
        customerName: customerName.trim() || undefined,
        changeOverride: changeDiffers ? Number(changeOverrideValue) : undefined,
      });
      setLastSaved({ total: combinedTotal, change: effectiveChange, owed: customerOwed });
      setCart(new Map());
      setAmountReceived('');
      setCustomerName('');
      setCustomerSearch('');
      setShowCustomerPicker(false);
      setShowChangeOverride(false);
      setChangeOverrideValue('');
      setShowSuccessDialog(true);
      shopApi.getDebts().then(setExistingDebts);
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
        <div className="back-row" style={{ justifyContent: 'space-between' }}>
          <div className="back-row">
            <button className="back-arrow" onClick={() => navigate('/shop')}>
              ←
            </button>
            <div className="shop-title">สร้างรายการขาย</div>
          </div>
          <button
            type="button"
            className={`chip ${customerName ? 'active' : ''}`}
            onClick={() => setShowCustomerPicker(true)}
          >
            {customerName || 'ลูกค้า'}
          </button>
        </div>
      </div>

      <div className="section-pad">
        {matchedDebt && (
          <div className="hint-text" style={{ textAlign: 'left', color: 'var(--debt-red)' }}>
            "{matchedDebt.customerName}" มียอดค้างเดิมอยู่ {formatMoney(matchedDebt.totalOwed)} บาท ({matchedDebt.saleCount}{' '}
            รายการ) - บิลนี้จะรวมยอดเก่าเข้ากับยอดขายวันนี้ให้อัตโนมัติ
          </div>
        )}

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
          {matchedDebt && (
            <>
              <div className="totals-row">
                <span>ยอดขายวันนี้</span>
                <span className="value tabular">{formatMoney(total)} บาท</span>
              </div>
              <div className="totals-row">
                <span>หนี้เดิม</span>
                <span className="value tabular" style={{ color: 'var(--debt-red)' }}>
                  {formatMoney(oldOwed)} บาท
                </span>
              </div>
            </>
          )}
          <div className="totals-row grand">
            <span className="label">{matchedDebt ? 'ยอดรวมที่ต้องเก็บ' : 'ยอดรวม'}</span>
            <span className="value tabular">{formatMoney(combinedTotal)} บาท</span>
          </div>
          <div className="field-group">
            <div className="field-label">รับเงินมา</div>
            <input
              className="field-input"
              type="number"
              value={amountReceived}
              onChange={(e) => {
                setError('');
                setAmountReceived(e.target.value);
              }}
            />
            {quickAmounts.length > 0 && (
              <div className="chip-row" style={{ marginTop: 8 }}>
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`chip ${received === amt ? 'active' : ''}`}
                    onClick={() => {
                      setError('');
                      setAmountReceived(String(amt));
                    }}
                  >
                    {formatMoney(amt)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="totals-row">
            <span>เงินทอน</span>
            <span className="value tabular">{formatMoney(effectiveChange)} บาท</span>
          </div>
          {!showChangeOverride ? (
            <button type="button" className="change-override-toggle" onClick={() => setShowChangeOverride(true)}>
              ปรับเงินทอน
            </button>
          ) : (
            <div className="field-group">
              <div className="field-label">เงินทอนจริงที่ให้ลูกค้า</div>
              <input
                className="field-input"
                type="number"
                value={changeOverrideValue}
                placeholder={String(computedChange)}
                onChange={(e) => setChangeOverrideValue(e.target.value)}
              />
            </div>
          )}
          {customerOwed > 0 && (
            <div className="totals-row">
              <span>ลูกค้าค้าง</span>
              <span className="value tabular" style={{ color: 'var(--debt-red)' }}>
                {formatMoney(customerOwed)} บาท
              </span>
            </div>
          )}
        </div>

        {error && <p className="shake" style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}
        <button className="btn btn-dark" disabled={busy || cartEntries.length === 0} onClick={handleSave}>
          บันทึกการขาย
        </button>
      </div>

      {cartEntries.length > 0 && !checkoutVisible && (
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

      {showSuccessDialog && lastSaved && (
        <div className="modal-backdrop" onClick={() => setShowSuccessDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="success-check-circle">
                <svg viewBox="0 0 24 24" width="30" height="30">
                  <path
                    d="M4 12l5 5L20 6"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="success-check-path"
                  />
                </svg>
              </div>
            </div>
            <h2 className="serif" style={{ textAlign: 'center' }}>
              บันทึกรายการขายแล้ว
            </h2>
            <div className="totals-row">
              <span>ยอดรวม</span>
              <span className="value tabular">{formatMoney(lastSaved.total)} บาท</span>
            </div>
            <div className="totals-row">
              <span>เงินทอน</span>
              <span className="value tabular">{formatMoney(lastSaved.change)} บาท</span>
            </div>
            {lastSaved.owed > 0 && (
              <div className="totals-row">
                <span>ลูกค้าค้าง</span>
                <span className="value tabular" style={{ color: 'var(--debt-red)' }}>
                  {formatMoney(lastSaved.owed)} บาท
                </span>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-dark" style={{ flex: 1 }} onClick={() => navigate('/shop')}>
                รับทราบ
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomerPicker && (
        <div className="sheet-backdrop" onClick={() => setShowCustomerPicker(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">เลือกลูกค้า</div>
            <div className="search-box">
              <span style={{ color: 'var(--muted-faint)' }}>⌕</span>
              <input
                autoFocus
                placeholder="พิมพ์ชื่อลูกค้า"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
            </div>

            {customerSearch.trim() &&
              !existingDebts.some((d) => d.customerName.toLowerCase() === customerSearch.trim().toLowerCase()) && (
                <button
                  type="button"
                  className="btn btn-outline-gold"
                  onClick={() => {
                    setCustomerName(customerSearch.trim());
                    setCustomerSearch('');
                    setShowCustomerPicker(false);
                  }}
                >
                  ใช้ชื่อ "{customerSearch.trim()}" (ลูกค้าใหม่)
                </button>
              )}

            {customerSuggestions.length === 0 ? (
              <p className="empty-state">ไม่มีลูกค้าที่ค้างชำระตรงกับที่ค้นหา</p>
            ) : (
              <div className="shop-list-panel">
                {customerSuggestions.map((d) => (
                  <button
                    key={d.customerName}
                    className="shop-row"
                    onClick={() => {
                      setCustomerName(d.customerName);
                      setCustomerSearch('');
                      setShowCustomerPicker(false);
                    }}
                  >
                    <div>
                      <div className="shop-row-name">{d.customerName}</div>
                      <div className="shop-row-sub">{d.saleCount} รายการค้าง</div>
                    </div>
                    <div className="shop-row-amount tabular">{formatMoney(d.totalOwed)}</div>
                  </button>
                ))}
              </div>
            )}

            {customerName && (
              <button
                type="button"
                className="btn-danger-text"
                onClick={() => {
                  setCustomerName('');
                  setCustomerSearch('');
                  setShowCustomerPicker(false);
                }}
              >
                ล้างลูกค้าที่เลือกไว้
              </button>
            )}
          </div>
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
