import { apiClient } from './api';
import type {
  Inspection,
  InspectionCreate,
  InspectionUpdate,
  PaginatedResponse,
} from '../types';

export interface InspectionQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  establishment_id?: number;
}

export const inspectionApi = {
  getPaginated: async (params: InspectionQueryParams = {}): Promise<PaginatedResponse<Inspection>> => {
    return apiClient<PaginatedResponse<Inspection>>('/inspections', {
      method: 'GET',
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        status: params.status,
        search: params.search,
        establishment_id: params.establishment_id,
      },
    });
  },

  getById: async (id: number): Promise<Inspection> => {
    return apiClient<Inspection>(`/inspections/${id}`, {
      method: 'GET',
    });
  },

  create: async (data: InspectionCreate): Promise<Inspection> => {
    return apiClient<Inspection>('/inspections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: InspectionUpdate): Promise<Inspection> => {
    return apiClient<Inspection>(`/inspections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<{ message: string; detail: string }> => {
    return apiClient<{ message: string; detail: string }>(`/inspections/${id}`, {
      method: 'DELETE',
    });
  },
};
