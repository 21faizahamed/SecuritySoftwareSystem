import { apiClient, getAuthToken } from './api';
import type {
  Document,
  DocumentCreate,
  DocumentProcessingResult,
  DocumentUploadResponse,
  PaginatedResponse,
  DocumentQueryParams,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const documentApi = {
  /**
   * List documents with optional query params
   */
  async getDocuments(params?: DocumentQueryParams): Promise<PaginatedResponse<Document>> {
    return apiClient<PaginatedResponse<Document>>('/documents', { params: params as any });
  },

  /**
   * Alias for getDocuments for backward compatibility
   */
  async getPaginated(params?: DocumentQueryParams): Promise<PaginatedResponse<Document>> {
    return apiClient<PaginatedResponse<Document>>('/documents', { params: params as any });
  },

  /**
   * Get single document metadata
   */
  async getDocument(id: number): Promise<Document> {
    return apiClient<Document>(`/documents/${id}`);
  },

  /**
   * Alias for getDocument
   */
  async getById(id: number): Promise<Document> {
    return apiClient<Document>(`/documents/${id}`);
  },

  /**
   * Get documents for an inspection
   */
  async getDocumentsByInspection(inspectionId: number): Promise<Document[]> {
    return apiClient<Document[]>(`/documents/inspection/${inspectionId}`);
  },

  /**
   * Alias for getDocumentsByInspection
   */
  async getByInspection(inspectionId: number): Promise<Document[]> {
    return apiClient<Document[]>(`/documents/inspection/${inspectionId}`);
  },

  /**
   * Create document metadata
   */
  async createMetadata(payload: DocumentCreate): Promise<Document> {
    return apiClient<Document>('/documents/metadata', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Upload an evidence file (JPG, PNG, PDF) for an inspection
   */
  async uploadDocument(
    inspectionId: number,
    file: File,
    documentType?: string,
    description?: string
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('inspection_id', String(inspectionId));
    if (documentType) formData.append('document_type', documentType);
    if (description) formData.append('description', description);

    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/inspections/${inspectionId}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Failed to upload document');
    }

    return response.json();
  },

  /**
   * Trigger text extraction / processing on a document
   */
  async processDocument(id: number): Promise<DocumentProcessingResult> {
    return apiClient<DocumentProcessingResult>(`/documents/${id}/process`, {
      method: 'POST',
    });
  },

  /**
   * Delete a document
   */
  async deleteDocument(id: number): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Alias for deleteDocument
   */
  async delete(id: number): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get direct URL to view/stream document
   */
  getDocumentViewUrl(id: number): string {
    const token = getAuthToken();
    return `${BASE_URL}/documents/${id}/view${token ? `?token=${token}` : ''}`;
  },

  /**
   * Get direct download URL for document
   */
  getDocumentDownloadUrl(id: number): string {
    const token = getAuthToken();
    return `${BASE_URL}/documents/${id}/download${token ? `?token=${token}` : ''}`;
  },
};
