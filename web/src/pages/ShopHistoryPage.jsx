import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../shopApi.js';
import { formatMoney, formatDateTimeThai, thaiMonthLabel } from '../lib/format.js';
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

export default function ShopHistoryPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonthKey());
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState(null);

  useEffect(() => {
    setSummary(null);
    setSales(null);
    Promise.all([shopApi.getSummary(month), shopApi.getSales(month)]).then(([s, list]) => {
      setSummary(s);
      setSales(list);
    });
  }, [month]);

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
        {sales === null ? (
          <Loader />
        ) : sales.length === 0 ? (
          <p className="empty-state">ไม่มีรายการขายในเดือนนี้</p>
        ) : (
          <div className="history-month">
            {sales.map((sale) => (
              <div className="history-entry" key={sale._id}>
                <div className="history-entry-top">
                  <div>
                    <div className="history-entry-title">
                      {sale.items.length} รายการ
                      {sale.customerOwed > 0 &&
                        (sale.paymentId ? (
                          <span className="paid-badge">ชำระแล้ว</span>
                        ) : (
                          <span className="unpaid-badge">ค้าง {formatMoney(sale.customerOwed)}</span>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
