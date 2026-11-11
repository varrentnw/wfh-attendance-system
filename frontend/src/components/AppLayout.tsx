import { Outlet } from 'react-router';
import LogoutButton from './LogoutButton';

/** The frame shared by every page behind the login: a header, then the current page. */
function AppLayout() {
  return (
    <>
      <header className="app-header">
        <strong>WFH Attendance</strong>
        <LogoutButton />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}

export default AppLayout;
