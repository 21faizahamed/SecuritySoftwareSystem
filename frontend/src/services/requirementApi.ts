import { apiClient } from './api';
import type {
  Requirement,
  RequirementCreate,
  RequirementUpdate,
  RequirementQueryParams,
  PaginatedResponse,
  PDFIngestionResponse,
} from '../types';

export const requirementApi = {
  /**
   * List regulatory requirements with optional filtering (search, category, severity, etc.)
   */
  async getRequirements(
    params?: RequirementQueryParams
  ): Promise<Requirement[] | PaginatedResponse<Requirement>> {
    return apiClient<Requirement[] | PaginatedResponse<Requirement>>('/requirements', {
      params: params as any,
    });
  },

  /**
   * Seed default regulatory requirements
   */
  async seedDefaults(): Promise<{ message: string; detail?: string }> {
    return apiClient<{ message: string; detail?: string }>('/requirements/seed-defaults', {
      method: 'POST',
    });
  },

  /**
   * Get requirement by ID
   */
  async getRequirement(id: number): Promise<Requirement> {
    return apiClient<Requirement>(`/requirements/${id}`);
  },

  /**
   * Create a new regulatory requirement
   */
  async createRequirement(payload: RequirementCreate): Promise<Requirement> {
    return apiClient<Requirement>('/requirements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update a regulatory requirement
   */
  async updateRequirement(
    id: number,
    payload: RequirementUpdate
  ): Promise<Requirement> {
    return apiClient<Requirement>(`/requirements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete or archive a regulatory requirement
   */
  async deleteRequirement(id: number): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/requirements/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Trigger ingestion from an uploaded official regulatory PDF
   */
  async ingestFromPDF(documentId: number): Promise<PDFIngestionResponse> {
    return apiClient<PDFIngestionResponse>(`/requirements/ingest-pdf/${documentId}`, {
      method: 'POST',
    });
  },
};
