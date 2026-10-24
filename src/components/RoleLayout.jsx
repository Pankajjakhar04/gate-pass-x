import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const navigation = {
  admin: [
    ['/admin', 'Dashboard'],
    ['/admin/employees', 'Employees'],
    ['/admin/security', 'Security'],
    ['/admin/registration-requests', 'Requests'],
    ['/admin/dependents', 'Dependents'],
    ['/admin/passes', 'Passes'],
    ['/admin/logs', 'Logs'],
    ['/admin/settings', 'Settings']
  ],
  employee: [
    ['/employee', 'Identity pass'],
    ['/employee/profile', 'Profile'],
    ['/employee/dependents', 'Dependents'],
    ['/employee/visitors/new', 'New visitor'],
    ['/employee/passes', 'Pass history']
  ],
  security: [
    ['/security', 'Verify'],
    ['/security/inside', 'Inside now'],
    ['/security/logs', 'Visitor logs']
  ]
};

export default function RoleLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const links = navigation[user.role] || [];
  const home = `/${user.role}`;

  function goBack() {
    if (location.pathname === home) return;
    navigate(-1);
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={`role-layout role-${user.role}`}>
      <header className="global-bar">
        <div className="global-brand">
          <button type="button" className="back-button" onClick={goBack} disabled={location.pathname === home} aria-label="Go back">
            Back
          </button>
          <Link to={home}>Gate Pass Portal</Link>
        </div>
        <nav className="role-nav" aria-label={`${user.role} navigation`}>
          {links.map(([path, label]) => (
            <NavLink key={path} to={path} end={path === home}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="global-user">
          <span>{user.email}</span>
          <button type="button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="role-content">
        <Outlet />
      </main>
    </div>
  );
}