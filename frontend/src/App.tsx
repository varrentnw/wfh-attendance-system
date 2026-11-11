import { Navigate, Route, Routes } from 'react-router';
import HomeRedirect from './auth/HomeRedirect';
import RequireRole from './auth/RequireRole';
import AppLayout from './components/AppLayout';
import AttendancePage from './pages/AttendancePage';
import CheckInPage from './pages/CheckInPage';
import EditEmployeePage from './pages/EditEmployeePage';
import EmployeesPage from './pages/EmployeesPage';
import LoginPage from './pages/LoginPage';
import NewEmployeePage from './pages/NewEmployeePage';

function App() {
  return (
    <Routes>
      {/* Public: anyone can open it. */}
      <Route path="/login" element={<LoginPage />} />

      {/* "/" has no page; it sends each user to their home. */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Guarded: the guard decides first, then the layout frames the page.
          Routes without a path only wrap the routes inside them. */}
      <Route element={<RequireRole role="EMPLOYEE" />}>
        <Route element={<AppLayout />}>
          <Route path="/check-in" element={<CheckInPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="HRD_ADMIN" />}>
        <Route element={<AppLayout />}>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/new" element={<NewEmployeePage />} />
          <Route
            path="/employees/:employeeId/edit"
            element={<EditEmployeePage />}
          />
          <Route path="/attendance" element={<AttendancePage />} />
        </Route>
      </Route>

      {/* Any other URL goes home. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
