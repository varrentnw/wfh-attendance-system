import { Navigate } from 'react-router';
import { useAuth } from './AuthContext';

function HomeRedirect() {
  const { session } = useAuth();
  if (session === null) {
    return <Navigate to="/login" replace />;
  } else if (session.role === 'EMPLOYEE') {
    return <Navigate to="/check-in" replace />;
  } else if (session.role === 'HRD_ADMIN') {
    return <Navigate to="/employees" replace />;
  }
}

export default HomeRedirect;
