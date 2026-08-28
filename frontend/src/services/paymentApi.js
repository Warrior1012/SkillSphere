import { apiClient } from './apiClient.js';

export const paymentApi = {
  fund: (payload) => apiClient.post('/payments/fund', payload).then((r) => r.data),
  confirm: (id, payload) => apiClient.post(`/payments/${id}/confirm`, payload).then((r) => r.data),
  release: (id) => apiClient.post(`/payments/${id}/release`).then((r) => r.data),
  refund: (id) => apiClient.post(`/payments/${id}/refund`).then((r) => r.data),
  mine: () => apiClient.get('/payments/mine').then((r) => r.data),
  forGig: (gigId) => apiClient.get(`/payments/gig/${gigId}`).then((r) => r.data),
};
