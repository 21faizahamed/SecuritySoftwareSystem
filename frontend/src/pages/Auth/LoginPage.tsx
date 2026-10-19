import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Shield,
  FileCheck2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in, redirect to dashboard or target route
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please provide both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login({
        username: username.trim(),
        password: password,
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      const detail = err.data?.detail || err.message;
      if (err.status === 401) {
        setErrorMessage('Invalid username or password. Please verify credentials.');
      } else if (err.status === 403) {
        setErrorMessage('This account has been disabled. Please contact an administrator.');
      } else {
        setErrorMessage(detail || 'Authentication service unreachable. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillDefaultCredentials = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMessage(null);
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        {/* Left Side: Brand & Context Showcase */}
        <div className="login-brand-panel">
          <div className="brand-header">
            <div className="brand-badge-icon">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="login-app-title">SCIS Platform</h1>
              <p className="login-app-subtitle">Security Certificate & Compliance Inspection</p>
            </div>
          </div>

          <div className="login-hero-content">
            <h2 className="hero-headline">
              Automated Safety & Regulatory Compliance Intelligence
            </h2>
            <p className="hero-subtext">
              Unified enterprise ecosystem for managing establishments, scheduling inspections,
              verifying compliance evidence, and issuing certified credentials.
            </p>

            <div className="hero-feature-list">
              <div className="hero-feature-item">
                <div className="feature-icon"><Shield size={18} /></div>
                <div>
                  <strong>Role-Based Access Control (RBAC)</strong>
                  <span>Strict multi-tier enforcement for Admin, Inspector, Reviewer, and Viewer.</span>
                </div>
              </div>
              <div className="hero-feature-item">
                <div className="feature-icon"><FileCheck2 size={18} /></div>
                <div>
                  <strong>Tamper-Evident Inspections</strong>
                  <span>Real-time digital audit logging, evidence verification, and document custody.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="login-panel-footer">
            <span className="env-badge">Phase 5 — Auth & Roles Active</span>
            <span className="version-tag">FastAPI REST + MariaDB Core</span>
          </div>
        </div>

        {/* Right Side: Authentication Card */}
        <div className="login-form-panel">
          <div className="form-card-header">
            <h3 className="form-title">Account Sign In</h3>
            <p className="form-subtitle">Enter your system credentials to access the secure console</p>
          </div>

          {errorMessage && (
            <div className="alert-banner alert-danger mb-4" role="alert">
              <AlertCircle size={18} />
              <div className="alert-content">
                <strong>Authentication Error</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="login-username" className="form-label">
                Username or Email Address
              </label>
              <div className="input-icon-wrapper">
                <span className="input-left-icon">
                  <User size={18} />
                </span>
                <input
                  id="login-username"
                  type="text"
                  className="form-input with-left-icon"
                  placeholder="e.g. admin or inspector"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <div className="input-icon-wrapper">
                <span className="input-left-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input with-left-icon with-right-icon"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-right-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="btn-spinner" />
                  <span>Authenticating Identity...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Console</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Helper Pill for Dev / Demo */}
          <div className="quick-access-box mt-4">
            <span className="quick-access-label">Test System Roles (Click to Fill):</span>
            <div className="quick-buttons">
              <button
                type="button"
                className="quick-btn"
                onClick={() => fillDefaultCredentials('admin', 'Admin@123456')}
              >
                <span>Admin (Full Access)</span>
                <code>admin / Admin@123456</code>
              </button>
              <button
                type="button"
                className="quick-btn"
                onClick={() => fillDefaultCredentials('customer', 'Customer@123456')}
              >
                <span>Customer (Applicant View)</span>
                <code>customer / Customer@123456</code>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
