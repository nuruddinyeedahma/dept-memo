import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatMoney, formatDateTimeThai } from '../lib/format.js';

export default function PaymentSheet({ shopId, shopName, onClose, onChanged }) {
  const [bills, setBills] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmUndoId, setConfirmUndoId] = useState(null);

  async function load() {
    const list = await api.getShopBills(shopId);
    setBills(list);
    setSelected((prev) => new Set([...prev].filter((id) => list.some((b) => b.id === id && !b.paid))));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const unpaidBills = useMemo(() => (bills ?? []).filter((b) => !b.paid), [bills]);
  const paidGroups = useMemo(() => {
    const map = new Map();
    for (const b of (bills ?? []).filter((b) => b.paid)) {
      if (!map.has(b.paymentId)) {
        map.set(b.paymentId, { paymentId: b.paymentId, paidAt: b.paymentAt, bills: [], amount: 0 });
      }
      const g = map.get(b.paymentId);
      g.bills.push(b);
      g.amount += b.amount;
    }
    return [...map.values()].sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));
  }, [bills]);

  const allSelected = unpaidBills.length > 0 && unpaidBills.every((b) => selected.has(b.id));
  const selectedTotal = unpaidBills.filter((b) => selected.has(b.id)).reduce((s, b) => s + b.amount, 0);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(unpaidBills.map((b) => b.id)));
  }

  async function handlePay() {
    if (selected.size === 0) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.createPayment(shopId, [...selected]);
      setSelected(new Set());
      await load();
      onChanged?.(result.outstandingDebt);
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
      const result = await api.deletePayment(shopId, paymentId);
      setConfirmUndoId(null);
      await load();
      onChanged?.(result.outstandingDebt);
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
          <div className="sheet-title">รับชำระ · {shopName}</div>
          <div style={{ fontSize: 13, color: 'var(--muted-soft)', marginTop: 4 }}>
            เลือกบิลที่ต้องการเคลียร์ จะได้ยอดรวมอัตโนมัติ
          </div>
        </div>

        {bills === null ? (
          <p className="empty-state">กำลังโหลด...</p>
        ) : bills.length === 0 ? (
          <p className="empty-state">ร้านนี้ยังไม่มีบิล</p>
        ) : (
          <>
            {unpaidBills.length > 0 && (
              <div className="pay-section">
                <div className="pay-section-header">
                  <span>รายการที่ยังไม่ชำระ</span>
                  <button onClick={toggleSelectAll}>{allSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}</button>
                </div>
                <div className="pay-list">
                  {unpaidBills.map((bill) => (
                    <label className="pay-row" key={bill.id}>
                      <input type="checkbox" checked={selected.has(bill.id)} onChange={() => toggle(bill.id)} />
                      <div className="pay-row-info">
                        <div className="pay-row-date">
                          {bill.imported ? 'นำเข้าจากข้อมูลเก่า' : formatDateTimeThai(bill.occurredAt)}
                        </div>
                        <div className="pay-row-sub">
                          {bill.entryCount} รายการ{bill.note ? ` · ${bill.note}` : ''}
                        </div>
                      </div>
                      <div className="pay-row-amount tabular">{formatMoney(bill.amount)}</div>
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

            {paidGroups.length > 0 && (
              <div className="pay-section">
                <div className="pay-section-header">
                  <span>ชำระแล้ว</span>
                </div>
                {paidGroups.map((group) => (
                  <div className="paid-group-card" key={group.paymentId}>
                    <div className="paid-group-top">
                      <div>
                        <div className="paid-group-date">{formatDateTimeThai(group.paidAt)}</div>
                        <div className="paid-group-sub">{group.bills.length} บิล</div>
                      </div>
                      <div className="paid-group-amount tabular">{formatMoney(group.amount)}</div>
                    </div>
                    <div className="paid-group-bills">
                      {group.bills.map((b) => (
                        <div key={b.id} className="paid-group-bill-row">
                          <span>{b.imported ? 'นำเข้าจากข้อมูลเก่า' : formatDateTimeThai(b.occurredAt)}</span>
                          <span className="tabular">{formatMoney(b.amount)}</span>
                        </div>
                      ))}
                    </div>
                    {confirmUndoId === group.paymentId ? (
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
                          onClick={() => handleUndo(group.paymentId)}
                        >
                          ยืนยันยกเลิก
                        </button>
                      </div>
                    ) : (
                      <button className="btn-danger-text" onClick={() => setConfirmUndoId(group.paymentId)}>
                        ยกเลิกการชำระนี้
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
