import { apiClient } from './apiClient.js';

export const adminApi = {
  listUsers: (params) => apiClient.get('/admin/users', { params }).then((r) => r.data),
  suspendUser: (id, reason) => apiClient.post(`/admin/users/${id}/suspend`, { reason }).then((r) => r.data),
  activateUser: (id) => apiClient.post(`/admin/users/${id}/activate`).then((r) => r.data),
  verifyFreelancer: (id) => apiClient.post(`/admin/freelancers/${id}/verify`).then((r) => r.data),
  flaggedReviews: () => apiClient.get('/admin/flagged-reviews').then((r) => r.data),
  dismissFlag: (id) => apiClient.post(`/admin/flagged-reviews/${id}/dismiss`).then((r) => r.data),
  deleteReview: (id) => apiClient.delete(`/admin/reviews/${id}`).then((r) => r.data),
  analytics: () => apiClient.get('/admin/analytics').then((r) => r.data),
};
