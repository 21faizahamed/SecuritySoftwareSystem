import { apiClient } from './api';
import type {
  AuthTokenResponse,
  CurrentUser,
  LoginCredentials,
} from '../types';

export const authApi = {
  /**
   * Authenticate user with username/email and password.
   * Returns JWT token and safe user payload.
   */
  async login(credentials: LoginCredentials): Promise<AuthTokenResponse> {
    return apiClient<AuthTokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true,
    });
  },

  /**
   * Log out currently authenticated user.
   */
  async logout(): Promise<{ detail: string }> {
    return apiClient<{ detail: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  /**
   * Retrieve current authenticated user profile, active role, and permissions.
   */
  async getCurrentUser(): Promise<CurrentUser> {
    return apiClient<CurrentUser>('/auth/me', {
      method: 'GET',
    });
  },
};
