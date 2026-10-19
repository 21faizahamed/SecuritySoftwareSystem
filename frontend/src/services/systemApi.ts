import { apiClient } from './api';
import type { SystemHealth, DatabaseStatus } from '../types';

export const systemApi = {
  getHealth: async (): Promise<SystemHealth> => {
    return apiClient<SystemHealth>('/health', {
      method: 'GET',
    });
  },

  getDatabaseStatus: async (): Promise<DatabaseStatus> => {
    return apiClient<DatabaseStatus>('/system/database-status', {
      method: 'GET',
    });
  },
};
