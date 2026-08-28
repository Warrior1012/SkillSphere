import { apiClient } from './apiClient.js';

export const notificationApi = {
  list: () => apiClient.get('/notifications').then((r) => r.data),
  markRead: (id) => apiClient.post(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.post('/notifications/read-all').then((r) => r.data),
};
