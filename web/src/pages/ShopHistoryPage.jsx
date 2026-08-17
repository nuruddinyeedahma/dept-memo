import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../shopApi.js';
import { formatMoney, formatDateTimeThai, thaiMonthLabel } from '../lib/format.js';
import Loader from '../components/Loader.jsx';

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('th-TH', { weekday: 'short' });

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(year, monthNum) {
  return new Date(year, monthNum, 0).getDate();
}

function defaultDayForMonth(monthKey) {
  const now = new Date();
  return monthKey === currentMonthKey() ? now.getDate() : 1;
}

function saleDate(sale) {
  return new Date(sale.createdAt.includes('T') ? sale.createdAt : sale.createdAt.replace(' ', 'T') + 'Z');
}

function saleStatusLabel(sale) {
  if (!sale.customerOwed || sale.customerOwed <= 0) return null;
  if (!sale.paymentId) return `ค้าง ${formatMoney(sale.customerOwed)} บาท`;
  if (sale.paymentKind === 'rollup') return 'ยอดย้ายไปบิลใหม่';
  return 'ชำระแล้ว';
}

function SaleEntry({ sale, onSelect }) {
  return (
    <div className="history-entry" onClick={onSelect ? () => onSelect(sale) : undefined}>
      <div className="history-entry-top">
        <div>
          <div className="history-entry-title">
            {sale.items.length} รายการ
            {sale.customerOwed > 0 &&
              (!sale.paymentId ? (
                <span className="unpaid-badge">ค้าง {formatMoney(sale.customerOwed)}</span>
              ) : sale.paymentKind === 'rollup' ? (
                <span className="override-badge" style={{ marginLeft: 6 }}>
                  ยอดย้ายไปบิลใหม่
                </span>
              ) : (
                <span className="paid-badge">ชำระแล้ว</span>
              ))}
          </div>
          <div className="history-entry-date">
            {formatDateTimeThai(sale.createdAt)}
            {sale.customerName ? ` · ${sale.customerName}` : ''}
          </div>
        </div>
        <div className="history-entry-amount tabular">{formatMoney(sale.total)}</div>
      </div>
      <div className="history-entry-detail">
        {sale.items.map((e, i) => (
          <div className="row" key={i}>
            <span>
              {e.itemName} × {e.quantity}
            </span>
            <span className="tabular">{formatMoney(e.unitPrice * e.quantity)}</span>
          </div>
        ))}
      </div>
      {sale.note && <div className="history-entry-note">{sale.note}</div>}
    </div>
  );
}

export default function ShopHistoryPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonthKey());
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState(null);
  const [mode, setMode] = useState('daily');
  const [selectedDay, setSelectedDay] = useState(() => defaultDayForMonth(currentMonthKey()));
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    setSummary(null);
    setSales(null);
    setSelectedDay(defaultDayForMonth(month));
    Promise.all([shopApi.getSummary(month), shopApi.getSales(month)]).then(([s, list]) => {
      setSummary(s);
      setSales(list);
    });
  }, [month]);

  const [year, monthNum] = month.split('-').map(Number);

  const daySales = useMemo(() => {
    if (!sales) return [];
    return sales.filter((s) => {
      const d = saleDate(s);
      return d.getFullYear() === year && d.getMonth() === monthNum - 1 && d.getDate() === selectedDay;
    });
  }, [sales, year, monthNum, selectedDay]);

  const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);
  const dayOwed = daySales.reduce((sum, s) => sum + (!s.paymentId ? s.customerOwed : 0), 0);

  function jumpToToday() {
    const todayKey = currentMonthKey();
    if (month !== todayKey) setMonth(todayKey);
    setSelectedDay(new Date().getDate());
  }

  const dayOptions = Array.from({ length: daysInMonth(year, monthNum) }, (_, i) => i + 1);
  const isToday = month === currentMonthKey() && selectedDay === new Date().getDate();

  return (
    <div className="app">
      <div className="dark-header">
        <div className="dark-header-top">
          <button className="icon-btn" onClick={() => navigate('/shop')}>
            ←
          </button>
          <div className="shop-title" style={{ color: '#F7F1E4' }}>
            ประวัติการขาย
          </div>
          <span style={{ width: 36 }} />
        </div>

        <div className="dark-header-top" style={{ alignItems: 'center', marginTop: 12 }}>
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))}>
            ‹
          </button>
          <div className="eyebrow">{thaiMonthLabel(year, monthNum - 1)}</div>
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))}>
            ›
          </button>
        </div>

        {mode === 'daily' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
            <select
              className="field-input"
              style={{ width: 'auto', padding: '6px 8px', fontSize: 13 }}
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
            >
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  วันที่ {d} ({WEEKDAY_FORMATTER.format(new Date(year, monthNum - 1, d))})
                </option>
              ))}
            </select>
            {!isToday && (
              <button
                className="icon-btn"
                style={{ width: 'auto', height: 'auto', padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                onClick={jumpToToday}
                title="กลับมาวันนี้"
              >
                วันนี้
              </button>
            )}
          </div>
        )}

        <div className="amount serif" style={{ marginTop: 6 }}>
          {!sales || !summary
            ? '···'
            : mode === 'daily'
              ? formatMoney(dayTotal)
              : formatMoney(summary.totalSales)}
          <span className="unit">บาท</span>
        </div>

        <div className="stat-row">
          <div className="stat-item">
            <div className="stat-label">จำนวนรายการ</div>
            <div className="stat-value tabular">
              {!sales || !summary ? '···' : mode === 'daily' ? `${daySales.length} รายการ` : `${summary.saleCount} รายการ`}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">{mode === 'daily' ? 'ลูกค้าค้าง' : 'ลูกค้าค้างรวม'}</div>
            <div className="stat-value tabular">
              {!sales || !summary ? '···' : formatMoney(mode === 'daily' ? dayOwed : summary.totalCustomerOwed)}
            </div>
          </div>
        </div>
      </div>

      <div className="section-pad">
        <div className="chip-row">
          <button className={`chip ${mode === 'daily' ? 'active' : ''}`} onClick={() => setMode('daily')}>
            รายวัน
          </button>
          <button className={`chip ${mode === 'month' ? 'active' : ''}`} onClick={() => setMode('month')}>
            รายเดือน
          </button>
        </div>

        {sales === null ? (
          <Loader />
        ) : mode === 'month' ? (
          sales.length === 0 ? (
            <p className="empty-state">ไม่มีรายการขายในเดือนนี้</p>
          ) : (
            <div className="history-month">
              {sales.map((sale) => (
                <SaleEntry key={sale._id} sale={sale} />
              ))}
            </div>
          )
        ) : daySales.length === 0 ? (
          <p className="empty-state">ไม่มีรายการขายในวันนี้</p>
        ) : (
          <div className="history-month">
            {daySales.map((sale) => (
              <SaleEntry key={sale._id} sale={sale} onSelect={setSelectedSale} />
            ))}
          </div>
        )}
      </div>

      {selectedSale && (
        <div className="modal-backdrop" onClick={() => setSelectedSale(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="serif">รายละเอียดรายการขาย</h2>
            <div style={{ fontSize: 13, color: 'var(--muted-soft)' }}>
              {formatDateTimeThai(selectedSale.createdAt)}
              {selectedSale.customerName ? ` · ${selectedSale.customerName}` : ''}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedSale.items.map((e, i) => (
                <div className="row" key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span>
                    {e.itemName} × {e.quantity}
                  </span>
                  <span className="tabular">{formatMoney(e.unitPrice * e.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="totals-row" style={{ paddingTop: 10, borderTop: '1px solid #E6DAC3' }}>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>ยอดรวม</span>
              <span className="tabular" style={{ fontFamily: "'Trirong', serif", fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>
                {formatMoney(selectedSale.total)} บาท
              </span>
            </div>

            {saleStatusLabel(selectedSale) && (
              <div className="totals-row">
                <span>สถานะ</span>
                <span
                  className="tabular"
                  style={{ color: !selectedSale.paymentId ? 'var(--debt-red)' : 'var(--paid-green)' }}
                >
                  {saleStatusLabel(selectedSale)}
                </span>
              </div>
            )}

            {selectedSale.note && <div className="history-entry-note">{selectedSale.note}</div>}

            <div className="modal-actions">
              <button className="btn btn-dark" style={{ flex: 1 }} onClick={() => setSelectedSale(null)}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
