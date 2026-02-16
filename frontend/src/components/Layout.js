import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ListTodo, Calendar, Activity, Settings, LogOut } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/tasks', icon: ListTodo, label: 'Tasks' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/activity', icon: Activity, label: 'Activity Log' },
  ];

  if (user?.role === 'Admin') {
    menuItems.push({ path: '/settings', icon: Settings, label: 'Settings' });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-ministry-bg-primary">
      <aside className="w-56 bg-ministry-bg-secondary border-r border-ministry-border-default flex flex-col">
        <div className="p-4 border-b border-ministry-border-default">
          <h1 className="text-lg font-semibold text-ministry-text-primary">Ministry Panel</h1>
        </div>
        
        <nav className="flex-1 p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-ministry text-sm mb-1 transition-colors ${
                  isActive
                    ? 'bg-ministry-bg-tertiary text-ministry-brand-primary font-medium'
                    : 'text-ministry-text-secondary hover:bg-ministry-bg-tertiary'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-ministry-border-default">
          <div className="text-sm text-ministry-text-secondary mb-2">
            <div className="font-medium text-ministry-text-primary">{user?.name}</div>
            <div className="text-xs">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-ministry text-sm text-ministry-text-secondary hover:bg-ministry-bg-tertiary transition-colors"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
