import { apiClient } from './api';
import type {
  PaginatedResponse,
  User,
  UserCreate,
  UserUpdate,
  Role,
  Permission,
} from '../types';

export const userApi = {
  /**
   * List paginated users with optional role and active status filtering.
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role_id?: number;
    is_active?: boolean;
    search?: string;
  }): Promise<PaginatedResponse<User>> {
    return apiClient<PaginatedResponse<User>>('/users', {
      params,
    });
  },

  /**
   * Get single user by ID.
   */
  async getUser(id: number): Promise<User> {
    return apiClient<User>(`/users/${id}`);
  },

  /**
   * Create a new user (ADMIN only).
   */
  async createUser(payload: UserCreate): Promise<User> {
    return apiClient<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update an existing user (ADMIN only).
   */
  async updateUser(id: number, payload: UserUpdate): Promise<User> {
    return apiClient<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Deactivate or delete user (ADMIN only).
   */
  async deleteUser(id: number): Promise<{ detail: string; id: number }> {
    return apiClient<{ detail: string; id: number }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Fetch all system roles and their assigned permissions.
   */
  async getRoles(): Promise<Role[]> {
    return apiClient<Role[]>('/roles');
  },

  /**
   * Fetch all system permissions.
   */
  async getPermissions(): Promise<Permission[]> {
    return apiClient<Permission[]>('/permissions');
  },
};
