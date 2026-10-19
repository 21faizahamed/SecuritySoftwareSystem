import { apiClient } from './api';
import type {
  Establishment,
  EstablishmentCreate,
  EstablishmentUpdate,
  PaginatedResponse,
} from '../types';

export interface EstablishmentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const establishmentApi = {
  getPaginated: async (params: EstablishmentQueryParams = {}): Promise<PaginatedResponse<Establishment>> => {
    return apiClient<PaginatedResponse<Establishment>>('/establishments', {
      method: 'GET',
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        search: params.search,
      },
    });
  },

  getById: async (id: number): Promise<Establishment> => {
    return apiClient<Establishment>(`/establishments/${id}`, {
      method: 'GET',
    });
  },

  create: async (data: EstablishmentCreate): Promise<Establishment> => {
    return apiClient<Establishment>('/establishments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: EstablishmentUpdate): Promise<Establishment> => {
    return apiClient<Establishment>(`/establishments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<{ message: string; detail: string }> => {
    return apiClient<{ message: string; detail: string }>(`/establishments/${id}`, {
      method: 'DELETE',
    });
  },
};
