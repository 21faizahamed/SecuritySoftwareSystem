import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRoles?: string | string[];
  requiredPermissions?: string | string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  requiredPermissions,
}) => {
  const { user, isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">
          <RefreshCw size={36} className="animate-spin text-primary" />
          <h3>Verifying Security Session</h3>
          <p>Please wait while your identity and permissions are authenticated...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to /login and preserve attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization
  if (requiredRoles && !hasRole(requiredRoles)) {
    return (
      <div className="unauthorized-page-container">
        <div className="unauthorized-card">
          <div className="unauthorized-icon-wrapper">
            <ShieldAlert size={48} className="text-danger" />
          </div>
          <h2 className="unauthorized-title">Access Restricted</h2>
          <p className="unauthorized-description">
            Your current account role (<strong>{user.role}</strong>) does not have
            permission to access this administrative module.
          </p>
          <div className="unauthorized-meta">
            <span>Required Role(s): {Array.isArray(requiredRoles) ? requiredRoles.join(', ') : requiredRoles}</span>
            <span>User: {user.username} ({user.email})</span>
          </div>
          <div className="unauthorized-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.history.back()}
            >
              Go Back
            </button>
            <a href="/dashboard" className="btn btn-outline">
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Check permission authorization
  if (requiredPermissions && !hasPermission(requiredPermissions)) {
    return (
      <div className="unauthorized-page-container">
        <div className="unauthorized-card">
          <div className="unauthorized-icon-wrapper">
            <ShieldAlert size={48} className="text-danger" />
          </div>
          <h2 className="unauthorized-title">Permission Denied</h2>
          <p className="unauthorized-description">
            You do not possess the required security permission to perform or view this operation.
          </p>
          <div className="unauthorized-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.history.back()}
            >
              Go Back
            </button>
            <a href="/dashboard" className="btn btn-outline">
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
