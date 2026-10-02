import { useContext, useCallback, useState } from 'react';
import { AuthContext, AuthContextType } from '../context/AuthContext';
import { ApiError, LoginPayload, RegisterPayload } from '../services/authApi';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const usePrivateRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  return { isAuthenticated, loading };
};

export const useAuthForm = () => {
  const { register, login, error, loading, clearError } = useAuth();
  const [formError, setFormError] = useState<string>('');

  const handleRegister = useCallback(
    async (email: string, password: string, confirmPassword: string) => {
      setFormError('');
      clearError();

      // Validation
      if (!email || !password || !confirmPassword) {
        setFormError('All fields are required');
        return false;
      }

      if (!isValidEmail(email)) {
        setFormError('Please enter a valid email');
        return false;
      }

      if (password.length < 8) {
        setFormError('Password must be at least 8 characters');
        return false;
      }

      if (password !== confirmPassword) {
        setFormError('Passwords do not match');
        return false;
      }

      try {
        await register({ email, password } as RegisterPayload);
        return true;
      } catch (err) {
        const apiError = err as ApiError;
        setFormError(apiError.message || 'Registration failed');
        return false;
      }
    },
    [register, clearError]
  );

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      setFormError('');
      clearError();

      // Validation
      if (!email || !password) {
        setFormError('Email and password are required');
        return false;
      }

      if (!isValidEmail(email)) {
        setFormError('Please enter a valid email');
        return false;
      }

      try {
        await login({ email, password } as LoginPayload);
        return true;
      } catch (err) {
        const apiError = err as ApiError;
        setFormError(apiError.message || 'Login failed');
        return false;
      }
    },
    [login, clearError]
  );

  return {
    handleRegister,
    handleLogin,
    formError,
    apiError: error,
    loading,
    clearError: () => {
      setFormError('');
      clearError();
    },
  };
};

export const useTokenRefresh = () => {
  const { refresh, refreshToken } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<ApiError | null>(null);

  const refreshTokens = useCallback(async () => {
    if (!refreshToken) {
      setRefreshError({
        message: 'No refresh token available',
      });
      return false;
    }

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      await refresh();
      setIsRefreshing(false);
      return true;
    } catch (err) {
      const apiError = err as ApiError;
      setRefreshError(apiError);
      setIsRefreshing(false);
      return false;
    }
  }, [refresh, refreshToken]);

  return {
    refreshTokens,
    isRefreshing,
    refreshError,
  };
};

/**
 * Email validation utility
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
