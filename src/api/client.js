import axios from 'axios';
import toast from 'react-hot-toast';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({ baseURL, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    const publicPaths = ['/login', '/forgot-password', '/reset-password'];
    const onPublicAuthPage = publicPaths.some((p) => window.location.pathname.startsWith(p));
    if (status === 401) {
      localStorage.removeItem('access_token');
      if (!onPublicAuthPage) {
        window.location.href = '/login';
      }
    } else if (status >= 500) {
      toast.error('Error del servidor. Intenta más tarde.');
    } else if (detail && typeof detail === 'string') {
      toast.error(detail);
    }
    return Promise.reject(error);
  },
);
