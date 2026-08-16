import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ShopNav from '../components/ShopNav.jsx';

export default function ShopHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app">
      <div className="light-header">
        <div className="shop-title">{user?.shopName || user?.displayName || 'ร้านค้า'}</div>
      </div>

      <div className="section-pad menu-card-list">
        <button className="menu-card" onClick={() => navigate('/shop/sell')}>
          <span className="menu-card-icon">+</span>
          <span className="menu-card-body">
            <span className="menu-card-title">สร้างรายการขาย</span>
            <span className="menu-card-sub">เลือกสินค้า คิดเงิน บันทึกยอดขาย</span>
          </span>
          <span className="menu-card-arrow">›</span>
        </button>

        <button className="menu-card" onClick={() => navigate('/shop/history')}>
          <span className="menu-card-icon">▤</span>
          <span className="menu-card-body">
            <span className="menu-card-title">ประวัติการขาย</span>
            <span className="menu-card-sub">ดูรายการย้อนหลังและสรุปยอดประจำเดือน</span>
          </span>
          <span className="menu-card-arrow">›</span>
        </button>

        <button className="menu-card" onClick={() => navigate('/shop/prices')}>
          <span className="menu-card-icon">฿</span>
          <span className="menu-card-body">
            <span className="menu-card-title">จัดการราคา</span>
            <span className="menu-card-sub">ตั้งราคาสินค้าเฉพาะร้านนี้</span>
          </span>
          <span className="menu-card-arrow">›</span>
        </button>

        <button className="menu-card" onClick={() => navigate('/shop/debts')}>
          <span className="menu-card-icon">✓</span>
          <span className="menu-card-body">
            <span className="menu-card-title">รับชำระหนี้</span>
            <span className="menu-card-sub">ปิดยอดค้างของลูกค้าที่มาจ่ายทีหลัง</span>
          </span>
          <span className="menu-card-arrow">›</span>
        </button>
      </div>

      <div style={{ flex: 1 }} />
      <ShopNav />
    </div>
  );
}
