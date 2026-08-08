import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney } from '../lib/format.js';
import RecordDebtTab from '../components/RecordDebtTab.jsx';
import PricesTab from '../components/PricesTab.jsx';
import HistoryTab from '../components/HistoryTab.jsx';
import EditShopSheet from '../components/EditShopSheet.jsx';
import PaymentSheet from '../components/PaymentSheet.jsx';

const TABS = [
  { key: 'record', label: 'บันทึกหนี้' },
  { key: 'prices', label: 'ราคา' },
  { key: 'history', label: 'ประวัติ' },
];

export default function ShopDetail() {
  const { id } = useParams();
  const shopId = Number(id);
  const [shop, setShop] = useState(null);
  const [tab, setTab] = useState('record');
  const [showEdit, setShowEdit] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const navigate = useNavigate();

  async function loadShop() {
    const shops = await api.getShops();
    setShop(shops.find((s) => s.id === shopId) ?? null);
  }

  useEffect(() => {
    loadShop();
  }, [shopId]);

  if (!shop) {
    return (
      <div className="app">
        <div className="light-header">
          <div className="back-row">
            <button className="back-arrow" onClick={() => navigate('/')}>
              ←
            </button>
          </div>
        </div>
        <p className="empty-state" style={{ padding: 20 }}>
          กำลังโหลด...
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="light-header">
        <div className="back-row" style={{ justifyContent: 'space-between' }}>
          <div className="back-row">
            <button className="back-arrow" onClick={() => navigate('/')}>
              ←
            </button>
            <div className="shop-title">{shop.name}</div>
          </div>
          <button className="icon-btn-light" onClick={() => setShowEdit(true)}>
            ⋯
          </button>
        </div>
        <div className="debt-line" style={{ justifyContent: 'space-between' }}>
          <div className="back-row" style={{ gap: 8 }}>
            <span className="caption">หนี้ค้าง</span>
            <span className={`amount tabular ${shop.outstandingDebt === 0 ? 'zero' : ''}`}>
              {formatMoney(shop.outstandingDebt)}
            </span>
            <span className="unit">บาท</span>
          </div>
          <button className="btn-pay-text" onClick={() => setShowPayment(true)}>
            รับชำระ
          </button>
        </div>

        <div className="tabs" style={{ padding: 0, marginTop: 14 }}>
          {TABS.map((t) => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'record' && <RecordDebtTab shopId={shopId} />}
      {tab === 'prices' && <PricesTab shopId={shopId} />}
      {tab === 'history' && <HistoryTab shopId={shopId} />}

      {showEdit && (
        <EditShopSheet
          shop={shop}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            loadShop();
          }}
          onDeleted={() => navigate('/')}
        />
      )}

      {showPayment && (
        <PaymentSheet
          shopId={shopId}
          shopName={shop.name}
          onClose={() => setShowPayment(false)}
          onChanged={() => loadShop()}
        />
      )}
    </div>
  );
}
