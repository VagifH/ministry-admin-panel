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
    <div className="flex h-screen bg-ministry-bg-app">
      {/* Sidebar */}
      <aside className="w-[180px] border-r border-ministry-border-subtle bg-ministry-bg-surface flex flex-col">
        <div className="p-4 border-b border-ministry-border-subtle flex items-center justify-between">
          <h1 className="text-base font-semibold text-ministry-text-primary">Ministry Panel</h1>
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
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-ministry text-[13px] mb-0.5 transition-colors ${
                  isActive
                    ? 'bg-ministry-interactive-selected text-ministry-brand-primary font-medium'
                    : 'text-ministry-text-secondary hover:bg-ministry-bg-hover hover:text-ministry-text-primary'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-ministry-border-subtle">
          <div className="mb-2">
            <p className="text-[13px] font-medium text-ministry-text-primary truncate">{user?.name}</p>
            <p className="text-xs text-ministry-text-muted">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-ministry text-ministry-text-secondary hover:bg-ministry-bg-hover hover:text-ministry-text-primary text-[13px] transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-ministry-bg-app">
        <Outlet />
      </main>
    </div>
  );
}
