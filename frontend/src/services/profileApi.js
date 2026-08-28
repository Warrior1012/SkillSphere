import { apiClient } from './apiClient.js';

export const profileApi = {
  getMine: () => apiClient.get('/profile/me').then((r) => r.data),
  getEarningsTimeline: () => apiClient.get('/profile/me/earnings-timeline').then((r) => r.data),
  updateBasics: (payload) => apiClient.patch('/profile/me/basics', payload).then((r) => r.data),
  updateRoleProfile: (payload) => apiClient.patch('/profile/me/role-profile', payload).then((r) => r.data),
  getPublic: (userId) => apiClient.get(`/profile/${userId}`).then((r) => r.data),
};
