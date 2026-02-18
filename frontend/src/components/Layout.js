import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessPage } from '../config/permissionsMatrix';
import { LayoutGrid, CheckSquare, Calendar, Activity, Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutGrid, label: 'Dashboard', page: 'dashboard' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks', page: 'tasks' },
  { path: '/calendar', icon: Calendar, label: 'Calendar', page: 'calendar' },
  { path: '/activity', icon: Activity, label: 'Activity Log', page: 'activity_log' },
  { path: '/settings', icon: Settings, label: 'Settings', page: 'settings' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter nav items based on user role
  const visibleNavItems = NAV_ITEMS.filter(item => 
    canAccessPage(user?.role, item.page)
  );

  return (
    <div className="flex h-screen bg-ministry-bg-primary">
      {/* Sidebar */}
      <aside className="w-[180px] border-r border-ministry-border-default bg-ministry-bg-secondary flex flex-col">
        <div className="p-4 border-b border-ministry-border-default flex items-center justify-between">
          <h1 className="text-lg font-semibold text-ministry-text-primary">Ministry Panel</h1>
          <ThemeToggle />
        </div>
        
        <nav className="flex-1 p-2">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path || 
                           (item.path === '/tasks' && location.pathname.startsWith('/tasks/'));
            const Icon = item.icon;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-ministry text-sm mb-1 transition-colors ${
                  isActive
                    ? 'bg-ministry-brand-light text-ministry-brand-primary font-medium'
                    : 'text-ministry-text-secondary hover:bg-ministry-bg-tertiary hover:text-ministry-text-primary'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-ministry-border-default">
          <div className="mb-2">
            <p className="text-sm font-medium text-ministry-text-primary truncate">{user?.name}</p>
            <p className="text-xs text-ministry-text-secondary">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-ministry text-ministry-text-secondary hover:bg-ministry-bg-tertiary text-sm"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
