import { apiClient } from './apiClient.js';

export const conversationApi = {
  list: () => apiClient.get('/conversations').then((r) => r.data),
  startOrGet: (recipientId, gigId) => apiClient.post('/conversations', { recipientId, gigId }).then((r) => r.data),
  getMessages: (conversationId) => apiClient.get(`/conversations/${conversationId}/messages`).then((r) => r.data),
  sendMessage: (conversationId, payload) => apiClient.post(`/conversations/${conversationId}/messages`, payload).then((r) => r.data),
};
