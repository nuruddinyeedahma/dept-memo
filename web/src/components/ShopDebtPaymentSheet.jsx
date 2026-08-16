import { useEffect, useMemo, useState } from 'react';
import { shopApi } from '../shopApi.js';
import { formatMoney, formatDateTimeThai } from '../lib/format.js';
import useLockBodyScroll from '../hooks/useLockBodyScroll.js';
import Loader from './Loader.jsx';

export default function ShopDebtPaymentSheet({ customerName, onClose, onChanged }) {
  useLockBodyScroll();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmUndoId, setConfirmUndoId] = useState(null);

  async function load() {
    const result = await shopApi.getCustomerDebt(customerName);
    setData(result);
    setSelected((prev) => new Set([...prev].filter((id) => result.unpaidSales.some((s) => s.id === id))));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerName]);

  const unpaidSales = data?.unpaidSales ?? [];
  const payments = data?.payments ?? [];
  const allSelected = unpaidSales.length > 0 && unpaidSales.every((s) => selected.has(s.id));
  const selectedTotal = unpaidSales.filter((s) => selected.has(s.id)).reduce((sum, s) => sum + s.customerOwed, 0);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(unpaidSales.map((s) => s.id)));
  }

  async function handlePay() {
    if (selected.size === 0) return;
    setBusy(true);
    setError('');
    try {
      await shopApi.payDebts(customerName, [...selected]);
      setSelected(new Set());
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo(paymentId) {
    setBusy(true);
    setError('');
    try {
      await shopApi.undoDebtPayment(paymentId);
      setConfirmUndoId(null);
      await load();
      onChanged?.();
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
        <div>
          <div className="sheet-title">รับชำระหนี้ · {customerName}</div>
          <div style={{ fontSize: 13, color: 'var(--muted-soft)', marginTop: 4 }}>
            เลือกรายการขายที่ลูกค้าจ่ายครั้งนี้ จะได้ยอดรวมอัตโนมัติ
          </div>
        </div>

        {data === null ? (
          <Loader />
        ) : (
          <>
            {unpaidSales.length > 0 && (
              <div className="pay-section">
                <div className="pay-section-header">
                  <span>รายการที่ยังไม่ชำระ</span>
                  <button onClick={toggleSelectAll}>{allSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}</button>
                </div>
                <div className="pay-list">
                  {unpaidSales.map((sale) => (
                    <label className="pay-row" key={sale.id}>
                      <input type="checkbox" checked={selected.has(sale.id)} onChange={() => toggle(sale.id)} />
                      <div className="pay-row-info">
                        <div className="pay-row-date">{formatDateTimeThai(sale.createdAt)}</div>
                        <div className="pay-row-sub">
                          {sale.itemCount} รายการ · ยอดขาย {formatMoney(sale.total)}
                        </div>
                      </div>
                      <div className="pay-row-amount tabular">{formatMoney(sale.customerOwed)}</div>
                    </label>
                  ))}
                </div>
                <div className="pay-selected-total">
                  <span>เลือกแล้ว {selected.size} รายการ</span>
                  <span className="tabular">{formatMoney(selectedTotal)} บาท</span>
                </div>
                <button className="btn btn-green" disabled={selected.size === 0 || busy} onClick={handlePay}>
                  บันทึกการชำระ {formatMoney(selectedTotal)} บาท
                </button>
              </div>
            )}

            {unpaidSales.length === 0 && payments.length === 0 && (
              <p className="empty-state">ลูกค้าคนนี้ไม่มีรายการค้างชำระแล้ว</p>
            )}

            {payments.length > 0 && (
              <div className="pay-section">
                <div className="pay-section-header">
                  <span>ประวัติ</span>
                </div>
                {payments.map((group) => (
                  <div className="paid-group-card" key={group.id}>
                    <div className="paid-group-top">
                      <div>
                        <div className="paid-group-date">
                          {formatDateTimeThai(group.paidAt)}
                          {group.kind === 'rollup' && (
                            <span className="override-badge" style={{ marginLeft: 6 }}>
                              ยอดย้ายไปบิลใหม่
                            </span>
                          )}
                        </div>
                        <div className="paid-group-sub">{group.sales.length} รายการขาย</div>
                      </div>
                      <div className="paid-group-amount tabular">{formatMoney(group.amount)}</div>
                    </div>
                    <div className="paid-group-bills">
                      {group.sales.map((s) => (
                        <div key={s.id} className="paid-group-bill-row">
                          <span>{formatDateTimeThai(s.createdAt)}</span>
                          <span className="tabular">{formatMoney(s.customerOwed)}</span>
                        </div>
                      ))}
                    </div>
                    {confirmUndoId === group.id ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-outline-gold"
                          style={{ flex: 1, padding: '10px' }}
                          disabled={busy}
                          onClick={() => setConfirmUndoId(null)}
                        >
                          ไม่ยกเลิก
                        </button>
                        <button
                          className="btn"
                          style={{ flex: 1, padding: '10px', background: 'var(--debt-red)', color: '#fff' }}
                          disabled={busy}
                          onClick={() => handleUndo(group.id)}
                        >
                          ยืนยันยกเลิก
                        </button>
                      </div>
                    ) : (
                      <button className="btn-danger-text" onClick={() => setConfirmUndoId(group.id)}>
                        {group.kind === 'rollup' ? 'แยกยอดนี้กลับคืน' : 'ยกเลิกการชำระนี้'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && <p style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
