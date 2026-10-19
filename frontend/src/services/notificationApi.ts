import { apiClient } from './api';
import type { Notification, NotificationUnreadCount } from '../types';

export const notificationApi = {
  /**
   * Get user notifications
   */
  async getNotifications(unreadOnly: boolean = false, limit: number = 20): Promise<Notification[]> {
    return apiClient<Notification[]>('/notifications', {
      params: { unread_only: unreadOnly, limit },
    });
  },

  /**
   * Get unread notification count badge
   */
  async getUnreadCount(): Promise<NotificationUnreadCount> {
    return apiClient<NotificationUnreadCount>('/notifications/unread-count');
  },

  /**
   * Mark single notification as read
   */
  async markAsRead(id: number): Promise<Notification> {
    return apiClient<Notification>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ message: string; count: number }> {
    return apiClient<{ message: string; count: number }>('/notifications/read-all', {
      method: 'PUT',
    });
  },
};
