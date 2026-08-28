import { apiClient } from './apiClient.js';

export const uploadApi = {
  upload: (file, folder = 'attachments') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    return apiClient.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
};
