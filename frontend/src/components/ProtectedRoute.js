import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './ui/loading';
import { canAccessPage } from '../config/permissionsMatrix';

/**
 * ProtectedRoute - Route guard with role-based access control
 * @param {React.ReactNode} children - Child components
 * @param {string} requiredRole - Specific role required (optional, legacy)
 * @param {string} page - Page name for RBAC check (e.g., 'settings', 'activity_log')
 */
export default function ProtectedRoute({ children, requiredRole, page }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ministry-bg-primary">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Page-based access control (new RBAC system)
  if (page && !canAccessPage(user.role, page)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ministry-bg-primary">
        <div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default p-8 max-w-md text-center shadow-ministry-card">
          <div className="w-12 h-12 rounded-full bg-ministry-status-rejected/10 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-ministry-status-rejected" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-ministry-text-primary mb-2">Access Denied</h2>
          <p className="text-ministry-text-secondary mb-4">
            Your role ({user.role}) doesn't have permission to access this page.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white px-4 py-2 rounded-ministry text-sm"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Legacy role-based check (for backwards compatibility)
  if (requiredRole && user.role !== requiredRole && user.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ministry-bg-primary">
        <div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default p-8 max-w-md text-center shadow-ministry-card">
          <div className="w-12 h-12 rounded-full bg-ministry-brand-light flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-ministry-status-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-ministry-text-primary mb-2">Access Denied</h2>
          <p className="text-ministry-text-secondary mb-4">
            You don't have permission to access this page. Please contact an administrator.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white px-4 py-2 rounded-ministry text-sm"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}
