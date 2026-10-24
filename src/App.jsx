import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/admin/Users';
import EmployeeHome from './pages/employee/Home';
import EmployeeDependents from './pages/employee/Dependents';
import AdminDependents from './pages/admin/Dependents';
import NewVisitor from './pages/employee/NewVisitor';
import Passes from './pages/employee/Passes';
import Scanner from './pages/security/Scanner';
import Inside from './pages/security/Inside';
import Logs from './pages/security/Logs';
import AdminSettings from './pages/admin/Settings';
import AdminPasses from './pages/admin/Passes';
import AdminLogs from './pages/admin/Logs';
import AdminEmployees from './pages/admin/Employees';
import AdminSecurity from './pages/admin/Security';
import Registration from './pages/Registration';
import RegistrationRequests from './pages/admin/RegistrationRequests';
import EmployeeProfile from './pages/employee/Profile';
import RoleLayout from './components/RoleLayout';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? `/${user.role}` : '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Registration />} />

      {/* Admin Protected Routes */}
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<RoleLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/employees" element={<AdminEmployees />} />
          <Route path="/admin/security" element={<AdminSecurity />} />
          <Route path="/admin/dependents" element={<AdminDependents />} />
          <Route path="/admin/registration-requests" element={<RegistrationRequests />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/passes" element={<AdminPasses />} />
          <Route path="/admin/logs" element={<AdminLogs />} />
        </Route>
      </Route>

      {/* Employee Protected Routes */}
      <Route element={<ProtectedRoute roles={['employee']} />}>
        <Route element={<RoleLayout />}>
          <Route path="/employee" element={<EmployeeHome />} />
          <Route path="/employee/profile" element={<EmployeeProfile />} />
          <Route path="/employee/dependents" element={<EmployeeDependents />} />
          <Route path="/employee/visitors/new" element={<NewVisitor />} />
          <Route path="/employee/passes" element={<Passes />} />
        </Route>
      </Route>

      {/* Security Protected Routes */}
      <Route element={<ProtectedRoute roles={['security']} />}>
        <Route element={<RoleLayout />}>
          <Route path="/security" element={<Scanner />} />
          <Route path="/security/inside" element={<Inside />} />
          <Route path="/security/logs" element={<Logs />} />
        </Route>
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}