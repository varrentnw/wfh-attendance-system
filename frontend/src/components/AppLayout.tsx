import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import LogoutButton from './LogoutButton';

/** The frame shared by every page behind the login: a header, then the current page. */
function AppLayout() {
  const { session } = useAuth();

  return (
    <>
      <header className="app-header">
        <strong className="app-title">WFH Attendance</strong>
        <nav className="app-nav">
          {/* The links only save a click; the route guards and the API decide who may see what. */}
          {session?.role === 'HRD_ADMIN' && (
            <>
              <NavLink to="/employees">Employees</NavLink>
              <NavLink to="/attendance">Attendance</NavLink>
            </>
          )}
          {session?.role === 'EMPLOYEE' && (
            <NavLink to="/check-in">Check-in</NavLink>
          )}
        </nav>
        <LogoutButton />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}

export default AppLayout;
