import { api } from './client.js';

export const citizensApi = {
  list: (params) => api.get('/citizens', { params }).then((r) => r.data),
  get: (id) => api.get(`/citizens/${id}`).then((r) => r.data),
  create: (payload) => api.post('/citizens', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/citizens/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/citizens/${id}`),
  upsertAddress: (id, payload) =>
    api.post(`/citizens/${id}/address`, payload).then((r) => r.data),
  ocr: (file, side, { force = false } = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    if (side) fd.append('side', side);
    if (force) fd.append('force', 'true');
    // OCR puede tardar >30s (Verificamex + posible fallback local), subimos el timeout.
    return api.post('/citizens/ocr', fd, { timeout: 120000 }).then((r) => r.data);
  },
  ocrQuality: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/citizens/ocr/quality', fd).then((r) => r.data);
  },
  uploadIne: (id, file, side) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('side', side);
    return api.post(`/citizens/${id}/documents/ine`, fd).then((r) => r.data);
  },
};
