import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi } from '../services/authApi';
import { getAuthToken, setAuthToken } from '../services/api';
import type { CurrentUser, LoginCredentials } from '../types';

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  hasPermission: (permissions: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (err: any) {
      // If token expired or invalid, reset credentials
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    // Listen to unauthorized 401 events from API client
    const handleUnauthorized = () => {
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
    };

    window.addEventListener('scis:auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('scis:auth:unauthorized', handleUnauthorized);
    };
  }, [fetchCurrentUser]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(credentials);
      setAuthToken(response.access_token);
      setTokenState(response.access_token);

      // Fetch the full authenticated user with roles & permissions
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (err: any) {
      setError(err.data?.detail || err.message || 'Login failed. Please check credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Proceed with local logout regardless of server network state
    } finally {
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const hasRole = useCallback(
    (roles: string | string[]): boolean => {
      if (!user) return false;
      const rawRole = user.role;
      const roleName = typeof rawRole === 'string' ? rawRole : (rawRole as any)?.name;
      if (!roleName) return false;
      const targetRoles = Array.isArray(roles) ? roles : [roles];
      return targetRoles.some(
        (r) => r.toUpperCase() === roleName.toUpperCase()
      );
    },
    [user]
  );

  const hasPermission = useCallback(
    (permissions: string | string[]): boolean => {
      if (!user || !user.permissions) return false;
      // ADMIN role has implicit access to everything
      if (user.role.toUpperCase() === 'ADMIN') return true;

      const targetPermissions = Array.isArray(permissions) ? permissions : [permissions];
      return targetPermissions.some((p) => user.permissions.includes(p));
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
