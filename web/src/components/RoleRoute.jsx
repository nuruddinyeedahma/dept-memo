import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function roleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'shop') return '/shop';
  return '/';
}

export default function RoleRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="app">
        <p className="empty-state" style={{ padding: 20 }}>
          กำลังโหลด...
        </p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}
