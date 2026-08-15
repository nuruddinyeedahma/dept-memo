import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { roleHome } from '../components/RoleRoute.jsx';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password, rememberMe);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!loading && user) return <Navigate to={roleHome(user.role)} replace />;

  return (
    <div className="app" style={{ justifyContent: 'center' }}>
      <div className="section-pad">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div className="serif" style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink)' }}>
            บันทึกหนี้ร้านค้า
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field-group">
            <div className="field-label">ชื่อผู้ใช้</div>
            <input
              className="field-input"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field-group">
            <div className="field-label">รหัสผ่าน</div>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <label className="active-toggle-row">
            <span>จดจำฉันไว้</span>
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
          </label>
          {error && <p style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" className="btn btn-dark" disabled={busy || !username || !password}>
            {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}
