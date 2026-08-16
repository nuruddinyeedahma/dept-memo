import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ShopHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app">
      <div className="light-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="shop-title">{user?.displayName || 'ร้านค้า'}</div>
        <button className="btn-danger-text" onClick={logout}>
          ออกจากระบบ
        </button>
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
      </div>
    </div>
  );
}
