import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney } from '../lib/format.js';
import PaymentSheet from '../components/PaymentSheet.jsx';

export default function CurrentBillPage() {
  const { id } = useParams();
  const shopId = Number(id);
  const [shop, setShop] = useState(null);
  const [bill, setBill] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [confirmClearCart, setConfirmClearCart] = useState(false);
  const navigate = useNavigate();

  async function load() {
    const [shops, openBill] = await Promise.all([api.getShops(), api.getOpenBill(shopId)]);
    setShop(shops.find((s) => s.id === shopId) ?? null);
    setBill(openBill);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  async function changeQty(itemId, delta) {
    setBusy(true);
    try {
      const updated = await api.addBillEntry(shopId, itemId, delta);
      setBill(updated);
    } finally {
      setBusy(false);
    }
  }

  async function handleClearCart() {
    setBusy(true);
    try {
      for (const entry of bill.entries) {
        await api.removeBillEntry(shopId, entry.id);
      }
      const updated = await api.getOpenBill(shopId);
      setBill(updated);
      setConfirmClearCart(false);
    } finally {
      setBusy(false);
    }
  }

  async function handlePost() {
    if (!bill.entries.length) return;
    setBusy(true);
    try {
      await api.clearBill(shopId, note.trim() || undefined);
      navigate(`/shops/${shopId}`);
    } finally {
      setBusy(false);
    }
  }

  if (!shop || !bill) {
    return <p className="empty-state" style={{ padding: 20 }}>กำลังโหลด...</p>;
  }

  const grandTotal = shop.outstandingDebt + bill.total;

  return (
    <div className="app">
      <div className="light-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="back-arrow" onClick={() => navigate(`/shops/${shopId}`)}>
          ←
        </button>
        <div className="shop-title" style={{ fontSize: 17 }}>
          บิลปัจจุบัน · {shop.name}
        </div>
        <button
          className="btn-danger-text"
          style={{ fontSize: 13 }}
          disabled={busy || bill.entries.length === 0}
          onClick={() => setConfirmClearCart(true)}
        >
          ล้างบิล
        </button>
      </div>

      <div className="section-pad" style={{ flex: 1 }}>
        {bill.entries.length === 0 ? (
          <p className="empty-state">ยังไม่มีรายการในบิลนี้</p>
        ) : (
          <div className="bill-line-panel">
            {bill.entries.map((entry) => (
              <div className="bill-line-row" key={entry.id}>
                <div>
                  <div className="bill-line-name">{entry.itemName}</div>
                  <div className="bill-line-sub tabular">
                    {entry.unitPrice} × {entry.quantity}
                  </div>
                </div>
                <div className="line-stepper">
                  <button disabled={busy} onClick={() => changeQty(entry.itemId, -1)}>
                    −
                  </button>
                  <span className="qty tabular">{entry.quantity}</span>
                  <button disabled={busy} onClick={() => changeQty(entry.itemId, 1)}>
                    +
                  </button>
                  <span className="line-total tabular">{formatMoney(entry.unitPrice * entry.quantity)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="notes-box">
          <div className="notes-label">หมายเหตุในบิล</div>
          <textarea
            placeholder="เช่น รับของวันศุกร์ นัดชำระสิ้นเดือน"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="totals-box">
          <div className="totals-row">
            <span>รวมบิลนี้</span>
            <span className="value tabular">{formatMoney(bill.total)} บาท</span>
          </div>
          <div className="totals-row">
            <span>หนี้ค้างเดิม</span>
            <span className="value tabular">{formatMoney(shop.outstandingDebt)} บาท</span>
          </div>
          <div className="totals-row grand">
            <span className="label">ยอดค้างรวม</span>
            <span className="value tabular">{formatMoney(grandTotal)} บาท</span>
          </div>
        </div>
      </div>

      <div className="section-pad" style={{ paddingTop: 0 }}>
        <button className="btn btn-dark" disabled={busy || bill.entries.length === 0} onClick={handlePost} style={{ marginBottom: 10 }}>
          บันทึกลงหนี้
        </button>
        <button className="btn btn-outline-gold" disabled={busy || shop.outstandingDebt === 0} onClick={() => setShowPayment(true)}>
          รับชำระเงิน
        </button>
      </div>

      {showPayment && (
        <PaymentSheet
          shopId={shopId}
          shopName={shop.name}
          onClose={() => setShowPayment(false)}
          onChanged={() => load()}
        />
      )}

      {confirmClearCart && (
        <div className="modal-backdrop" onClick={() => setConfirmClearCart(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="serif">ล้างบิลนี้?</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>รายการทั้งหมดในบิลปัจจุบันจะถูกลบ</p>
            <div className="modal-actions">
              <button className="btn btn-outline-gold" disabled={busy} onClick={() => setConfirmClearCart(false)}>
                ยกเลิก
              </button>
              <button className="btn btn-dark" style={{ background: 'var(--debt-red)' }} disabled={busy} onClick={handleClearCart}>
                ล้างบิล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
