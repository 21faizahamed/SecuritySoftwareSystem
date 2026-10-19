import { apiClient, getAuthToken } from './api';
import type { InspectionReportResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const reportApi = {
  /**
   * Get inspection report structured data
   */
  async getReportData(inspectionId: number): Promise<InspectionReportResponse> {
    return apiClient<InspectionReportResponse>(`/reports/inspection/${inspectionId}`);
  },

  /**
   * Generate & download PDF inspection report
   */
  async downloadInspectionReportPDF(inspectionId: number): Promise<Blob> {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(
      `${BASE_URL}/reports/inspection/${inspectionId}/pdf`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Failed to generate inspection report PDF');
    }

    return response.blob();
  },

  /**
   * Get direct stream URL for inspection report PDF
   */
  getReportPdfUrl(inspectionId: number): string {
    const token = getAuthToken();
    return `${BASE_URL}/reports/inspection/${inspectionId}/pdf${
      token ? `?token=${token}` : ''
    }`;
  },
};
