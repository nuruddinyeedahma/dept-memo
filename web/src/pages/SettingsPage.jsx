import { useState } from 'react';
import BottomNav from '../components/BottomNav.jsx';
import AdminNav from '../components/AdminNav.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [refreshBusy, setRefreshBusy] = useState(false);

  async function handleRefresh() {
    setRefreshBusy(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      }
    } finally {
      window.location.reload();
    }
  }

  return (
    <div className="app">
      <div className="light-header">
        <div className="shop-title">ตั้งค่า</div>
      </div>

      <div className="section-pad">
        <div className="add-item-card">
          <div className="add-item-card-title">บัญชี</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
            เข้าสู่ระบบด้วย {user?.username} ({user?.role === 'admin' ? 'แอดมิน' : 'ลูกค้า'})
          </p>
          <button className="btn btn-outline-gold" onClick={logout}>
            ออกจากระบบ
          </button>
        </div>

        <div className="add-item-card">
          <div className="add-item-card-title">รีเฟรชแอป</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
            ถ้าแอปแสดงข้อมูลเก่าหรือค้าง กดปุ่มนี้เพื่อล้างแคชแล้วโหลดเวอร์ชันล่าสุด
          </p>
          <button className="btn btn-outline-gold" disabled={refreshBusy} onClick={handleRefresh}>
            {refreshBusy ? 'กำลังรีเฟรช...' : 'รีเฟรชแอป'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      {user?.role === 'admin' ? <AdminNav /> : <BottomNav />}
    </div>
  );
}
