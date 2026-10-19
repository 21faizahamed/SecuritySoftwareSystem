import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Database,
  Server,
  RefreshCw,
  Bell,
  Check,
  ShieldAlert,
  Award,
  FileText,
} from 'lucide-react';
import { systemApi } from '../../services/systemApi';
import { notificationApi } from '../../services/notificationApi';
import { formatDateTime } from '../../utils/formatters';
import type { DatabaseStatus, SystemHealth, Notification } from '../../types';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/establishments/') && pathname !== '/establishments') {
      return 'Establishment Profile';
    }
    if (pathname.startsWith('/inspections/') && pathname !== '/inspections') {
      return 'Inspection Workspace';
    }
    switch (pathname) {
      case '/dashboard':
      case '/':
        return 'Overview Dashboard';
      case '/establishments':
        return 'Establishments Directory';
      case '/inspections':
        return 'Compliance Inspections';
      case '/documents':
        return 'Document Records';
      case '/requirements':
        return 'UAE Civil Defense Standards';
      case '/certificates':
        return 'Certificates Registry';
      case '/audit-logs':
        return 'System Audit Trail';
      case '/users':
        return 'User & Access Management';
      case '/settings':
        return 'System Diagnostics & Settings';
      default:
        return 'Compliance Platform';
    }
  };

  const fetchStatus = async () => {
    setIsRefreshing(true);
    try {
      const [h, db, notifUnread, notifList] = await Promise.allSettled([
        systemApi.getHealth(),
        systemApi.getDatabaseStatus(),
        notificationApi.getUnreadCount(),
        notificationApi.getNotifications(false, 10),
      ]);

      if (h.status === 'fulfilled') setHealth(h.value);
      else setHealth({ status: 'offline', application: 'API Offline' });

      if (db.status === 'fulfilled') setDbStatus(db.value);
      else setDbStatus({ database: 'MySQL', status: 'disconnected' });

      if (notifUnread.status === 'fulfilled') setUnreadCount(notifUnread.value.unread_count);
      if (notifList.status === 'fulfilled') setNotifications(notifList.value);
    } catch {
      setHealth({ status: 'offline', application: 'API Offline' });
      setDbStatus({ database: 'MySQL', status: 'disconnected' });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Check periodically
    const timer = setInterval(fetchStatus, 30000);
    return () => clearInterval(timer);
  }, []);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await notificationApi.markAsRead(notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error(err);
      }
    }
    if (notif.link) {
      setIsNotifOpen(false);
      navigate(notif.link);
    }
  };

  const isBackendOk = health?.status === 'ok';
  const isDbOk = dbStatus?.status === 'connected';

  return (
    <header className="app-header">
      <div className="header-left">
        <h2 className="header-page-title">{getPageTitle(location.pathname)}</h2>
      </div>

      <div className="header-right">
        {/* Backend API Status Pill */}
        <div
          className={`status-chip ${isBackendOk ? 'online' : 'offline'}`}
          title={`Backend API: ${health?.application || 'Offline'}`}
        >
          <Server size={14} />
          <span className="chip-dot" />
          <span className="chip-label">
            {isBackendOk ? 'API Online' : 'API Offline'}
          </span>
        </div>

        {/* Database Status Pill */}
        <div
          className={`status-chip ${isDbOk ? 'online' : 'offline'}`}
          title={`MySQL DB: ${dbStatus?.database || 'disconnected'} (Port: ${dbStatus?.port || '4306'})`}
        >
          <Database size={14} />
          <span className="chip-dot" />
          <span className="chip-label">
            {isDbOk ? 'MySQL Connected' : 'DB Disconnected'}
          </span>
        </div>

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            className="header-icon-btn relative"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title="System Notifications"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {/* Dropdown Menu */}
          {isNotifOpen && (
            <div className="notif-dropdown-menu">
              <div className="notif-header flex justify-between items-center p-3 border-b">
                <span className="font-bold text-sm text-main">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={handleMarkAllRead}
                  >
                    <Check size={12} /> Mark all read
                  </button>
                )}
              </div>

              <div className="notif-list-body max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notif-item-row p-3 border-b cursor-pointer transition-colors ${
                        !notif.is_read ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="notif-icon-circle mt-0.5">
                          {notif.notification_type === 'CERTIFICATE_ISSUED' ? (
                            <Award size={14} className="text-success" />
                          ) : notif.notification_type === 'INSPECTION_REJECTED' ? (
                            <ShieldAlert size={14} className="text-danger" />
                          ) : (
                            <FileText size={14} className="text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-main leading-tight">{notif.title}</p>
                          <p className="text-xs text-secondary mt-0.5 line-clamp-2">{notif.message}</p>
                          <span className="text-[10px] text-muted font-mono mt-1 block">
                            {formatDateTime(notif.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Re-check Status Button */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={fetchStatus}
          disabled={isRefreshing}
          title="Refresh system status"
          aria-label="Refresh status"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>
    </header>
  );
};
