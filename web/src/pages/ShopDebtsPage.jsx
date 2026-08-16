import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../shopApi.js';
import { formatMoney, formatRelativeThai } from '../lib/format.js';
import ShopDebtPaymentSheet from '../components/ShopDebtPaymentSheet.jsx';
import Loader from '../components/Loader.jsx';

export default function ShopDebtsPage() {
  const navigate = useNavigate();
  const [debts, setDebts] = useState(null);
  const [openCustomer, setOpenCustomer] = useState(null);

  function load() {
    shopApi.getDebts().then(setDebts);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="app">
      <div className="light-header">
        <div className="back-row">
          <button className="back-arrow" onClick={() => navigate('/shop')}>
            ←
          </button>
          <div className="shop-title">รับชำระหนี้</div>
        </div>
      </div>

      <div className="section-pad">
        {debts === null ? (
          <Loader />
        ) : debts.length === 0 ? (
          <p className="empty-state">ไม่มีลูกค้าค้างชำระ</p>
        ) : (
          <div className="shop-list-panel">
            {debts.map((d) => (
              <button key={d.customerName} className="shop-row" onClick={() => setOpenCustomer(d.customerName)}>
                <div>
                  <div className="shop-row-name">{d.customerName}</div>
                  <div className="shop-row-sub">
                    {d.saleCount} รายการ · ล่าสุด {formatRelativeThai(d.lastAt)}
                  </div>
                </div>
                <div className="shop-row-amount tabular">{formatMoney(d.totalOwed)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {openCustomer && (
        <ShopDebtPaymentSheet
          customerName={openCustomer}
          onClose={() => setOpenCustomer(null)}
          onChanged={() => load()}
        />
      )}
    </div>
  );
}
