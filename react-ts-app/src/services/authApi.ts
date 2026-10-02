import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface AuthResponse {
  status: number;
  message: string;
  data?: {
    userId?: string;
    email?: string;
    createdAt?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    expiresIn?: number;
  };
  error?: string;
  timestamp: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  details?: string;
}

class AuthApi {
  private api: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add access token to headers
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle 401 and token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<AuthResponse>) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for token refresh to complete
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.api(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await this.refreshAccessToken(refreshToken);
            const newAccessToken = response.data?.data?.accessToken;
            const newRefreshToken = response.data?.data?.refreshToken;

            if (newAccessToken && newRefreshToken) {
              localStorage.setItem('accessToken', newAccessToken);
              localStorage.setItem('refreshToken', newRefreshToken);

              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

              // Notify all waiting requests
              this.refreshSubscribers.forEach((callback) => callback(newAccessToken));
              this.refreshSubscribers = [];

              return this.api(originalRequest);
            } else {
              throw new Error('Invalid refresh response');
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            this.refreshSubscribers = [];

            // Dispatch custom event for app-wide logout
            window.dispatchEvent(new CustomEvent('auth:logout'));

            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private refreshAccessToken(refreshToken: string): Promise<AxiosResponse<AuthResponse>> {
    const axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return axiosInstance.post<AuthResponse>('/api/auth/refresh', {
      refreshToken,
    });
  }

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/register', payload);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/login', payload);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/refresh', {
        refreshToken,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/logout', {});
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): ApiError {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as AuthResponse;
      return {
        message: data?.message || error.message || 'An error occurred',
        statusCode: error.response?.status,
        details: data?.error,
      };
    }

    return {
      message: error?.message || 'An unexpected error occurred',
    };
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }
}

export const authApi = new AuthApi();
