import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatMoney, formatDateTimeThai, groupByThaiMonth } from '../lib/format.js';

const FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'payment', label: 'การชำระ' },
  { key: 'bill', label: 'บิลที่เคลียร์' },
];

export default function HistoryTab({ shopId }) {
  const [timeline, setTimeline] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [billDetail, setBillDetail] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.getHistory(shopId).then(setTimeline);
  }, [shopId]);

  const filtered = useMemo(
    () => (filter === 'all' ? timeline : timeline.filter((e) => e.kind === filter)),
    [timeline, filter]
  );
  const groups = useMemo(() => groupByThaiMonth(filtered), [filtered]);

  async function toggleBill(billId) {
    const key = `bill-${billId}`;
    if (openId === key) {
      setOpenId(null);
      setBillDetail(null);
      return;
    }
    setOpenId(key);
    setBillDetail(await api.getBill(billId));
  }

  function togglePayment(paymentId) {
    const key = `payment-${paymentId}`;
    setOpenId(openId === key ? null : key);
  }

  if (timeline.length === 0) {
    return <p className="empty-state" style={{ padding: 20 }}>ยังไม่มีประวัติ</p>;
  }

  return (
    <div className="section-pad">
      <div className="chip-row">
        {FILTERS.map((f) => (
          <button key={f.key} className={`chip ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {groups.map((group) => (
        <div className="history-month" key={group.key}>
          <div className="history-month-header">
            <span className="history-month-title">{group.label}</span>
            {group.key !== 'imported' && (
              <span className="history-month-summary tabular">
                จ่ายหนี้ {formatMoney(group.paid)} · ลงหนี้ {formatMoney(group.billed)}
              </span>
            )}
          </div>

          {group.entries.map((entry) =>
            entry.kind === 'payment' ? (
              <div className="history-entry" key={`payment-${entry.id}`} onClick={() => togglePayment(entry.id)}>
                <div className="history-entry-top">
                  <div>
                    <div className="history-entry-title payment">จ่ายหนี้ · {entry.bills?.length ?? 0} บิล</div>
                    <div className="history-entry-date">{formatDateTimeThai(entry.occurredAt)}</div>
                  </div>
                  <div className="history-entry-amount payment tabular">− {formatMoney(entry.amount)}</div>
                </div>
                {openId === `payment-${entry.id}` && (
                  <div className="history-entry-detail">
                    {(entry.bills ?? []).map((b) => (
                      <div className="row" key={b.id}>
                        <span>{b.imported ? 'นำเข้าจากข้อมูลเก่า' : formatDateTimeThai(b.occurredAt)}</span>
                        <span className="tabular">{formatMoney(b.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {entry.note && <div className="history-entry-note">{entry.note}</div>}
              </div>
            ) : (
              <div className="history-entry" key={`bill-${entry.id}`} onClick={() => toggleBill(entry.id)}>
                <div className="history-entry-top">
                  <div>
                    <div className="history-entry-title">
                      {entry.imported ? 'นำเข้าจากข้อมูลเก่า' : `เคลียร์บิล · ${entry.entryCount} รายการ`}
                      {entry.paid ? (
                        <span className="paid-badge">ชำระแล้ว</span>
                      ) : (
                        <span className="unpaid-badge">ยังไม่ชำระ</span>
                      )}
                    </div>
                    <div className="history-entry-date">{formatDateTimeThai(entry.occurredAt)}</div>
                  </div>
                  <div className="history-entry-amount tabular">{formatMoney(entry.amount)}</div>
                </div>
                {openId === `bill-${entry.id}` && billDetail && (
                  <div className="history-entry-detail">
                    {billDetail.entries.map((e) => (
                      <div className="row" key={e.id}>
                        <span>
                          {e.itemName} × {e.quantity}
                        </span>
                        <span className="tabular">{formatMoney(e.unitPrice * e.quantity)}</span>
                      </div>
                    ))}
                    {entry.note && <div className="history-entry-note">หมายเหตุ: {entry.note}</div>}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
}
