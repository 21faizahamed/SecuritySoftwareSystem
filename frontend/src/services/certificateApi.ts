import { apiClient, getAuthToken } from './api';
import type {
  Certificate,
  CertificateVerificationResponse,
  CertificateQueryParams,
  PaginatedResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const certificateApi = {
  /**
   * List issued certificates
   */
  async getCertificates(
    params?: CertificateQueryParams
  ): Promise<PaginatedResponse<Certificate>> {
    return apiClient<PaginatedResponse<Certificate>>('/certificates', {
      params: params as any,
    });
  },

  /**
   * Get certificate by certificate number
   */
  async getCertificate(certificateNumber: string): Promise<Certificate> {
    return apiClient<Certificate>(`/certificates/${certificateNumber}`);
  },

  /**
   * Get certificate by inspection ID
   */
  async getCertificateByInspection(inspectionId: number): Promise<Certificate> {
    return apiClient<Certificate>(`/certificates/inspection/${inspectionId}`);
  },

  /**
   * Public verification endpoint (safe for QR code direct scan, no auth required)
   */
  async verifyCertificate(
    certificateNumber: string
  ): Promise<CertificateVerificationResponse> {
    return apiClient<CertificateVerificationResponse>(
      `/certificates/verify/${certificateNumber}`,
      { skipAuth: true }
    );
  },

  /**
   * Download certificate PDF blob
   */
  async downloadCertificatePDF(certificateNumber: string): Promise<Blob> {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(
      `${BASE_URL}/certificates/${certificateNumber}/download`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Failed to download certificate PDF');
    }

    return response.blob();
  },

  /**
   * Get direct view/stream URL for certificate PDF
   */
  getCertificatePdfUrl(certificateNumber: string): string {
    const token = getAuthToken();
    return `${BASE_URL}/certificates/${certificateNumber}/download${
      token ? `?token=${token}` : ''
    }`;
  },
};
