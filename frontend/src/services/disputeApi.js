import { apiClient } from './apiClient.js';

export const disputeApi = {
  raise: (payload) => apiClient.post('/disputes', payload).then((r) => r.data),
  mine: () => apiClient.get('/disputes/mine').then((r) => r.data),
};

export const adminDisputeApi = {
  list: (status) => apiClient.get('/admin/disputes', { params: status ? { status } : {} }).then((r) => r.data),
  resolve: (id, payload) => apiClient.post(`/admin/disputes/${id}/resolve`, payload).then((r) => r.data),
};
