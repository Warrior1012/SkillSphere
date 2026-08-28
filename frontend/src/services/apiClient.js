import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends/receives the httpOnly refresh cookie
});

let accessToken = null;
let onUnauthorized = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/** Registered once by AuthProvider — called when refresh itself fails (i.e. truly logged out). */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Don't try to "refresh" a refresh call that itself failed — that's a
    // real logout, not a retry opportunity.
    if (status === 401 && !original._retry && !original.url?.includes('/auth/refresh')) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise || apiClient.post('/auth/refresh');
        const res = await refreshPromise;
        refreshPromise = null;
        setAccessToken(res.data.data.accessToken);
        original.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
        return apiClient(original);
      } catch (refreshErr) {
        refreshPromise = null;
        setAccessToken(null);
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
