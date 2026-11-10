import { Navigate, Route, Routes } from 'react-router';
import HomeRedirect from './auth/HomeRedirect';
import RequireRole from './auth/RequireRole';
import CheckInPage from './pages/CheckInPage';
import EmployeesPage from './pages/EmployeesPage';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <Routes>
      {/* Public: anyone can open it. */}
      <Route path="/login" element={<LoginPage />} />

      {/* "/" has no page; it sends each user to their home. */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Guarded: the guard has no path. It wraps the routes inside it,
          and they render where the guard puts its <Outlet />. */}
      <Route element={<RequireRole role="EMPLOYEE" />}>
        <Route path="/check-in" element={<CheckInPage />} />
      </Route>

      {/* TODO 1: the same block for HRD_ADMIN, with /employees → EmployeesPage. */}
      <Route element={<RequireRole role="HRD_ADMIN" />}>
        <Route path="/employees" element={<EmployeesPage />} />
      </Route>

      {/* TODO 2: any other URL → redirect to "/".
          A Route with path="*" whose element is a <Navigate>. */}
      <Route path="*" element={<Navigate to='/' replace/>}/>
    </Routes>
  );
}

export default App;