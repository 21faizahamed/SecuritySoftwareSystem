import type { ApiError } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiException extends Error {
  public status: number;
  public data: ApiError;

  constructor(status: number, data: ApiError) {
    super(data.detail || `Request failed with status ${status}`);
    this.name = 'ApiException';
    this.status = status;
    this.data = data;
  }
}

export const AUTH_TOKEN_KEY = 'scis_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, skipAuth, ...customConfig } = options;

  let url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 204) {
      return {} as T;
    }

    let responseData: any = {};
    const text = await response.text();
    if (text) {
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = { detail: text };
      }
    }

    if (!response.ok) {
      // If 401 unauthorized and we had a token, optionally notify
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        window.dispatchEvent(new CustomEvent('scis:auth:unauthorized'));
      }

      throw new ApiException(response.status, {
        detail: responseData.detail || `HTTP Error ${response.status}: ${response.statusText}`,
        error_code: responseData.error_code,
        path: responseData.path,
      });
    }

    return responseData as T;
  } catch (err: any) {
    if (err instanceof ApiException) {
      throw err;
    }
    throw new ApiException(0, {
      detail: err.message || 'Network error: Failed to communicate with FastAPI backend',
    });
  }
}

