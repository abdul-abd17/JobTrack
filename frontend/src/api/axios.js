/**
 * Centralized Axios API Client
 * 
 * SECURITY ARCHITECTURE NOTE:
 * - Access Token: Kept in memory during the session, with localStorage sync for page reloads.
 * - Refresh Token: Stored for silent session renewal with server-side rotation & blacklisting.
 * - SECURITY TRADE-OFF: Storing tokens in browser storage (localStorage) makes them accessible
 *   to malicious scripts if the application has an XSS vulnerability. To mitigate this:
 *   1. JWT lifetime is kept short (60 minutes).
 *   2. Refresh tokens rotate on every refresh call (SimpleJWT token rotation).
 *   3. Used/revoked refresh tokens are permanently blacklisted on the backend.
 *   4. For strict banking/enterprise deployments, the recommended upgrade is moving the
 *      refresh token to an HttpOnly, Secure, SameSite=Strict cookie with CSRF double-submit protection.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// In-memory access token store
let inMemoryAccessToken = localStorage.getItem('jobtrack_access_token') || null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
  if (token) {
    localStorage.setItem('jobtrack_access_token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('jobtrack_access_token');
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const getAccessToken = () => inMemoryAccessToken;

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Helper for managing in-flight refresh requests (prevents thundering herd / duplicate refreshes)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor: attaches access token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handles 401 & silent token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login/') ||
      originalRequest?.url?.includes('/auth/register/') ||
      originalRequest?.url?.includes('/auth/token/refresh/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('jobtrack_refresh_token');

      if (!refreshToken) {
        isRefreshing = false;
        setAccessToken(null);
        localStorage.removeItem('jobtrack_refresh_token');
        localStorage.removeItem('jobtrack_user');
        window.dispatchEvent(new Event('jobtrack:auth-expired'));
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        setAccessToken(newAccessToken);

        // If rotation returned a new refresh token, update it
        if (response.data.refresh) {
          localStorage.setItem('jobtrack_refresh_token', response.data.refresh);
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh token expired or blacklisted
        setAccessToken(null);
        localStorage.removeItem('jobtrack_refresh_token');
        localStorage.removeItem('jobtrack_user');
        window.dispatchEvent(new Event('jobtrack:auth-expired'));

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
