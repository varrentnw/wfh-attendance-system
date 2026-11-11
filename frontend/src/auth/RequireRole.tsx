import type { Role } from '../types/api';
import { useAuth } from './AuthContext';
import { Navigate, Outlet } from 'react-router';

function RequireRole({ role }: { role: Role }) {
  const { session } = useAuth();
  if (session === null) {
    return <Navigate to="/login" replace />;
  }
  if (session.role !== role) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export default RequireRole;
