import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  FileText,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  LogOut,
  Shield,
  User as UserIcon,
  BookOpen,
  Award,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Accordion state for Phase 1, Phase 2, and System Administration
  const [isPhase1Open, setIsPhase1Open] = React.useState(true);
  const [isPhase2Open, setIsPhase2Open] = React.useState(true);
  const [isAdminOpen, setIsAdminOpen] = React.useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const rawRole = user?.role;
  const currentRoleName = typeof rawRole === 'string' ? rawRole : (rawRole as any)?.name;
  const isAdmin = currentRoleName?.toUpperCase() === 'ADMIN';

  const phase1Items = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/establishments',
      label: 'Establishments',
      icon: Building2,
    },
    {
      to: '/inspections',
      label: 'Inspections',
      icon: ClipboardCheck,
    },
  ];

  const phase2Items = [
    {
      to: '/documents',
      label: 'Documents',
      icon: FileText,
    },
    ...(isAdmin
      ? [
          {
            to: '/requirements',
            label: 'UAE Standards',
            icon: BookOpen,
          },
        ]
      : []),
    {
      to: '/certificates',
      label: 'Certificates',
      icon: Award,
    },
  ];

  const adminItems = isAdmin
    ? [
        {
          to: '/audit-logs',
          label: 'Audit Trail',
          icon: Activity,
        },
        {
          to: '/users',
          label: 'Users & Access',
          icon: Users,
        },
        {
          to: '/settings',
          label: 'Settings',
          icon: Settings,
        },
      ]
    : [];

  const getRoleClass = (roleName?: string) => {
    switch (roleName?.toUpperCase()) {
      case 'ADMIN':
        return 'role-badge-admin';
      case 'INSPECTOR':
        return 'role-badge-inspector';
      case 'REVIEWER':
        return 'role-badge-reviewer';
      case 'VIEWER':
        return 'role-badge-viewer';
      default:
        return '';
    }
  };

  return (
    <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo-icon">
          <ShieldCheck size={26} strokeWidth={2.2} />
        </div>
        {!isCollapsed && (
          <div className="brand-text-block">
            <h1 className="brand-title">SCIS Platform</h1>
            <span className="brand-subtitle">Compliance & Safety</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Main Navigation">
        {/* PHASE 1 ACCORDION */}
        <div className="nav-phase-section">
          {!isCollapsed ? (
            <button
              type="button"
              className="nav-phase-header-btn"
              onClick={() => setIsPhase1Open(!isPhase1Open)}
              aria-expanded={isPhase1Open}
            >
              <div className="nav-phase-header-left">
                <span className="phase-pill-badge p1-badge">Phase 1</span>
                <span className="nav-phase-title">Eligibility & Scope</span>
              </div>
              <span className="phase-toggle-icon">
                {isPhase1Open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </button>
          ) : (
            <div className="collapsed-section-divider" title="Phase 1: Eligibility & Scope">
              <span className="collapsed-phase-tag">P1</span>
            </div>
          )}

          {(isPhase1Open || isCollapsed) && (
            <ul className="nav-list">
              {phase1Items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to} className="nav-item">
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className="nav-icon">
                        <Icon size={18} />
                      </span>
                      {!isCollapsed && <span className="nav-label">{item.label}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* PHASE 2 ACCORDION */}
        <div className="nav-phase-section mt-3">
          {!isCollapsed ? (
            <button
              type="button"
              className="nav-phase-header-btn"
              onClick={() => setIsPhase2Open(!isPhase2Open)}
              aria-expanded={isPhase2Open}
            >
              <div className="nav-phase-header-left">
                <span className="phase-pill-badge p2-badge">Phase 2</span>
                <span className="nav-phase-title">Layout & Inspection</span>
              </div>
              <span className="phase-toggle-icon">
                {isPhase2Open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </button>
          ) : (
            <div className="collapsed-section-divider" title="Phase 2: Layout & Security Inspections">
              <span className="collapsed-phase-tag">P2</span>
            </div>
          )}

          {(isPhase2Open || isCollapsed) && (
            <ul className="nav-list">
              {phase2Items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to} className="nav-item">
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className="nav-icon">
                        <Icon size={18} />
                      </span>
                      {!isCollapsed && <span className="nav-label">{item.label}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* SYSTEM & ADMINISTRATION ACCORDION (Only for Admin users) */}
        {adminItems.length > 0 && (
          <div className="nav-phase-section mt-3">
            {!isCollapsed ? (
              <button
                type="button"
                className="nav-phase-header-btn"
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                aria-expanded={isAdminOpen}
              >
                <div className="nav-phase-header-left">
                  <span className="phase-pill-badge psys-badge">System</span>
                  <span className="nav-phase-title">Settings & Access</span>
                </div>
                <span className="phase-toggle-icon">
                  {isAdminOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </button>
            ) : (
              <div className="collapsed-section-divider" title="System & Settings">
                <span className="collapsed-phase-tag">SYS</span>
              </div>
            )}

            {(isAdminOpen || isCollapsed) && (
              <ul className="nav-list">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to} className="nav-item">
                      <NavLink
                        to={item.to}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <span className="nav-icon">
                          <Icon size={18} />
                        </span>
                        {!isCollapsed && <span className="nav-label">{item.label}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </nav>

      {/* User Identity & Logout Box */}
      {user && (
        <div className={`sidebar-user-section ${isCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-user-info" title={`${user.full_name} (${user.email})`}>
            <div className="user-avatar-circle">
              {user.full_name?.charAt(0).toUpperCase() || <UserIcon size={16} />}
            </div>
            {!isCollapsed && (
              <div className="user-meta-block">
                <span className="user-full-name">{user.full_name}</span>
                <span className={`user-role-badge ${getRoleClass(user.role)}`}>
                  <Shield size={10} />
                  {user.role}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      )}

      <div className="sidebar-footer">
        <button
          type="button"
          className="collapse-toggle-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!isCollapsed && <span>Collapse Menu</span>}
        </button>
      </div>
    </aside>
  );
};
