import { api } from './client.js';

export const authApi = {
  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    return data;
  },
  me: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
  requestPasswordReset: async (email) => {
    const { data } = await api.post('/auth/password-reset/request', { email });
    return data;
  },
  confirmPasswordReset: async (token, password) => {
    const { data } = await api.post('/auth/password-reset/confirm', { token, password });
    return data;
  },
};
