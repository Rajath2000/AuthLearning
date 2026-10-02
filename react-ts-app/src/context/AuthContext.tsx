import React, { createContext, useState, useCallback, useEffect } from 'react';
import { authApi, ApiError, RegisterPayload, LoginPayload } from '../services/authApi';

export interface User {
  userId: string;
  email: string;
  createdAt?: string;
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: ApiError | null;
  isAuthenticated: boolean;
  register: (payload: RegisterPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');

    if (storedAccessToken) {
      setAccessToken(storedAccessToken);
    }
    if (storedRefreshToken) {
      setRefreshToken(storedRefreshToken);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
  }, []);

  // Listen for logout events from API interceptor
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      setError({
        message: 'Your session has expired. Please log in again.',
      });
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.register(payload);
      if (response.data?.userId && response.data?.email) {
        const userData: User = {
          userId: response.data.userId,
          email: response.data.email,
          createdAt: response.data.createdAt,
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
      setLoading(false);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setLoading(false);
      throw apiError;
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.login(payload);
      const token = response.data?.accessToken;
      const refresh = response.data?.refreshToken;

      if (token && refresh) {
        setAccessToken(token);
        setRefreshToken(refresh);
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refresh);

        // Fetch user info from token or store it if provided
        if (response.data?.email) {
          const userData: User = {
            userId: response.data.userId || 'unknown',
            email: response.data.email,
          };
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
      }
      setLoading(false);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setLoading(false);
      throw apiError;
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Always clear local state regardless of API call result
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      authApi.clearTokens();
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!refreshToken) {
      setError({
        message: 'No refresh token available',
      });
      return;
    }

    try {
      const response = await authApi.refresh(refreshToken);
      const token = response.data?.accessToken;
      const newRefresh = response.data?.refreshToken;

      if (token) {
        setAccessToken(token);
        localStorage.setItem('accessToken', token);
      }
      if (newRefresh) {
        setRefreshToken(newRefresh);
        localStorage.setItem('refreshToken', newRefresh);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      // On refresh error, clear auth
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      authApi.clearTokens();
      throw apiError;
    }
  }, [refreshToken]);

  const isAuthenticated = !!accessToken && !!user;

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    refresh,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
