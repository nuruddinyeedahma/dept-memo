import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { key: 'home', label: 'หน้าหลัก', path: '/shop' },
  { key: 'settings', label: 'ตั้งค่า', path: '/settings' },
];

export default function ShopNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const active = TABS.find((t) => t.path === location.pathname)?.key ?? null;

  return (
    <nav className="bottom-nav">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`bottom-nav-item ${active === t.key ? 'active' : ''}`}
          onClick={() => navigate(t.path)}
        >
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
