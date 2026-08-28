import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Spinner } from './ui.jsx';

export function ProtectedRoute() {
  const { user, status } = useSelector((s) => s.auth);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet />;
}

/** Usage: <Route element={<RoleRoute allow={['admin']} />}>...</Route> */
export function RoleRoute({ allow }) {
  const { user } = useSelector((s) => s.auth);
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
