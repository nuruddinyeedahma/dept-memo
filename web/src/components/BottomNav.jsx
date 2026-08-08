import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { key: 'shops', label: 'ร้านค้า', path: '/' },
  { key: 'items', label: 'สินค้า', path: null },
  { key: 'settings', label: 'ตั้งค่า', path: '/settings' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [comingSoon, setComingSoon] = useState(false);

  function handleClick(tab) {
    if (tab.path) {
      navigate(tab.path);
      return;
    }
    setComingSoon(true);
  }

  const active = TABS.find((t) => t.path === location.pathname)?.key ?? null;

  return (
    <>
      {comingSoon && (
        <div className="modal-backdrop" onClick={() => setComingSoon(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="serif">เร็วๆ นี้</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>ฟีเจอร์นี้ยังไม่เปิดใช้งาน</p>
            <div className="modal-actions">
              <button className="btn btn-dark" onClick={() => setComingSoon(false)}>
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
      <nav className="bottom-nav">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`bottom-nav-item ${active === t.key ? 'active' : ''}`}
            onClick={() => handleClick(t)}
          >
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
