import { apiClient, getAuthToken } from './api';
import type {
  AuditLog,
  AuditLogQueryParams,
  PaginatedResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const auditApi = {
  /**
   * List audit logs with pagination and filters
   */
  async getAuditLogs(
    params?: AuditLogQueryParams
  ): Promise<PaginatedResponse<AuditLog>> {
    return apiClient<PaginatedResponse<AuditLog>>('/audit-logs', {
      params: params as any,
    });
  },

  /**
   * Get single audit log entry
   */
  async getAuditLog(id: number): Promise<AuditLog> {
    return apiClient<AuditLog>(`/audit-logs/${id}`);
  },

  /**
   * Export audit logs to CSV
   */
  async exportCsv(params?: AuditLogQueryParams): Promise<Blob> {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      });
    }

    const qs = searchParams.toString();
    const url = `${BASE_URL}/audit-logs/export/csv${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Failed to export audit logs to CSV');
    }

    return response.blob();
  },
};
