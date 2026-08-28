import { apiClient } from './apiClient.js';

export const reviewApi = {
  create: (payload) => apiClient.post('/reviews', payload).then((r) => r.data),
  forUser: (userId) => apiClient.get(`/reviews/user/${userId}`).then((r) => r.data),
  forGig: (gigId) => apiClient.get(`/reviews/gig/${gigId}`).then((r) => r.data),
};
