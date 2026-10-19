import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { NotificationItem } from '../../types';

interface NotificationContextType {
  notifications: NotificationItem[];
  addNotification: (item: Omit<NotificationItem, 'id'>) => void;
  removeNotification: (id: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addNotification = useCallback(
    (item: Omit<NotificationItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newNotification: NotificationItem = { ...item, id };

      setNotifications((prev) => [...prev, newNotification]);

      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    },
    [removeNotification]
  );

  const showSuccess = useCallback(
    (message: string, title: string = 'Success') => {
      addNotification({ type: 'success', title, message });
    },
    [addNotification]
  );

  const showError = useCallback(
    (message: string, title: string = 'Error') => {
      addNotification({ type: 'error', title, message });
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (message: string, title: string = 'Warning') => {
      addNotification({ type: 'warning', title, message });
    },
    [addNotification]
  );

  const showInfo = useCallback(
    (message: string, title: string = 'Info') => {
      addNotification({ type: 'info', title, message });
    },
    [addNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <NotificationContainer
        notifications={notifications}
        onDismiss={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const NotificationContainer: React.FC<{
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="notification-toast-container" aria-live="polite">
      {notifications.map((n) => {
        let Icon = Info;
        if (n.type === 'success') Icon = CheckCircle2;
        if (n.type === 'error') Icon = AlertCircle;
        if (n.type === 'warning') Icon = AlertTriangle;

        return (
          <div key={n.id} className={`toast-card toast-${n.type}`}>
            <div className="toast-icon">
              <Icon size={20} />
            </div>
            <div className="toast-body">
              {n.title && <div className="toast-title">{n.title}</div>}
              <div className="toast-message">{n.message}</div>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => onDismiss(n.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
