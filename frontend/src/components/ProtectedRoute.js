import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './ui/loading';

export default function ProtectedRoute({ children, requiredRole }) {
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

  // Role-based access control
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
