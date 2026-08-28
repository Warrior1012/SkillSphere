import { apiClient } from './apiClient.js';

export const authApi = {
  register: (payload) => apiClient.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => apiClient.post('/auth/login', payload).then((r) => r.data),
  verify2FALogin: (payload) => apiClient.post('/auth/2fa/verify-login', payload).then((r) => r.data),
  refresh: () => apiClient.post('/auth/refresh').then((r) => r.data),
  logout: () => apiClient.post('/auth/logout').then((r) => r.data),
  me: () => apiClient.get('/auth/me').then((r) => r.data),
  verifyEmail: (token) => apiClient.get(`/auth/verify-email/${token}`).then((r) => r.data),
  resendVerification: () => apiClient.post('/auth/resend-verification').then((r) => r.data),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token, password) => apiClient.post(`/auth/reset-password/${token}`, { password }).then((r) => r.data),
  setup2FA: () => apiClient.post('/auth/2fa/setup').then((r) => r.data),
  enable2FA: (code) => apiClient.post('/auth/2fa/enable', { code }).then((r) => r.data),
  disable2FA: () => apiClient.post('/auth/2fa/disable').then((r) => r.data),
};
