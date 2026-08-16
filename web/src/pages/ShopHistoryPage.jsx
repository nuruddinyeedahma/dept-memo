import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../shopApi.js';
import { formatMoney, formatDateTimeThai, formatDateThai, thaiMonthLabel } from '../lib/format.js';
import Loader from '../components/Loader.jsx';

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function SaleEntry({ sale }) {
  return (
    <div className="history-entry">
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
  const [mode, setMode] = useState('month');
  const [expandedDays, setExpandedDays] = useState(new Set());

  useEffect(() => {
    setSummary(null);
    setSales(null);
    setExpandedDays(new Set());
    Promise.all([shopApi.getSummary(month), shopApi.getSales(month)]).then(([s, list]) => {
      setSummary(s);
      setSales(list);
    });
  }, [month]);

  const dailyGroups = useMemo(() => {
    if (!sales) return [];
    const map = new Map();
    for (const sale of sales) {
      const d = new Date(sale.createdAt.includes('T') ? sale.createdAt : sale.createdAt.replace(' ', 'T') + 'Z');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { key, sales: [], total: 0 });
      const group = map.get(key);
      group.sales.push(sale);
      group.total += sale.total;
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [sales]);

  function toggleDay(key) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const [year, monthNum] = month.split('-').map(Number);

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

        <div className="amount serif" style={{ marginTop: 6 }}>
          {summary ? formatMoney(summary.totalSales) : '···'}
          <span className="unit">บาท</span>
        </div>

        <div className="stat-row">
          <div className="stat-item">
            <div className="stat-label">จำนวนรายการ</div>
            <div className="stat-value tabular">{summary ? `${summary.saleCount} รายการ` : '···'}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">ลูกค้าค้างรวม</div>
            <div className="stat-value tabular">{summary ? formatMoney(summary.totalCustomerOwed) : '···'}</div>
          </div>
        </div>
      </div>

      <div className="section-pad">
        <div className="chip-row">
          <button className={`chip ${mode === 'month' ? 'active' : ''}`} onClick={() => setMode('month')}>
            รายเดือน
          </button>
          <button className={`chip ${mode === 'daily' ? 'active' : ''}`} onClick={() => setMode('daily')}>
            รายวัน
          </button>
        </div>

        {sales === null ? (
          <Loader />
        ) : sales.length === 0 ? (
          <p className="empty-state">ไม่มีรายการขายในเดือนนี้</p>
        ) : mode === 'month' ? (
          <div className="history-month">
            {sales.map((sale) => (
              <SaleEntry key={sale._id} sale={sale} />
            ))}
          </div>
        ) : (
          <div className="history-month">
            {dailyGroups.map((day) => (
              <div key={day.key}>
                <div className="history-entry" onClick={() => toggleDay(day.key)}>
                  <div className="history-entry-top">
                    <div>
                      <div className="history-entry-title">{day.sales.length} รายการ</div>
                      <div className="history-entry-date">
                        {formatDateThai(day.sales[0].createdAt)} · {expandedDays.has(day.key) ? 'ซ่อนรายการ ▾' : 'ดูรายการ ▸'}
                      </div>
                    </div>
                    <div className="history-entry-amount tabular">{formatMoney(day.total)}</div>
                  </div>
                </div>
                {expandedDays.has(day.key) && (
                  <div className="history-month" style={{ marginTop: 10 }}>
                    {day.sales.map((sale) => (
                      <SaleEntry key={sale._id} sale={sale} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
