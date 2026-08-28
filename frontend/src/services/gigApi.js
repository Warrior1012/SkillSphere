import { apiClient } from './apiClient.js';

export const gigApi = {
  list: (params) => apiClient.get('/gigs', { params }).then((r) => r.data),
  mine: () => apiClient.get('/gigs/mine').then((r) => r.data),
  getById: (id) => apiClient.get(`/gigs/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/gigs', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/gigs/${id}`, payload).then((r) => r.data),
  cancel: (id) => apiClient.post(`/gigs/${id}/cancel`).then((r) => r.data),
  completeGig: (id) => apiClient.post(`/gigs/${id}/complete`).then((r) => r.data),
  updateMilestone: (gigId, milestoneId, note) => apiClient.patch(`/gigs/${gigId}/milestones/${milestoneId}`, { note }).then((r) => r.data),
  recommendedFreelancers: (id) => apiClient.get(`/gigs/${id}/recommended-freelancers`).then((r) => r.data),
};

export const proposalApi = {
  submit: (gigId, payload) => apiClient.post(`/gigs/${gigId}/proposals`, payload).then((r) => r.data),
  listForGig: (gigId) => apiClient.get(`/gigs/${gigId}/proposals`).then((r) => r.data),
  mine: () => apiClient.get('/proposals/mine').then((r) => r.data),
  withdraw: (id) => apiClient.post(`/proposals/${id}/withdraw`).then((r) => r.data),
  accept: (id) => apiClient.post(`/proposals/${id}/accept`).then((r) => r.data),
  reject: (id) => apiClient.post(`/proposals/${id}/reject`).then((r) => r.data),
};
