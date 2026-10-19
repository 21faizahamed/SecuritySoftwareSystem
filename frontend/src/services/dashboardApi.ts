import { apiClient } from './api';
import type { DashboardSummary } from '../types';

export const dashboardApi = {
  /**
   * Fetch live aggregate dashboard summary from the database
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    return apiClient<DashboardSummary>('/dashboard/summary');
  },
};
