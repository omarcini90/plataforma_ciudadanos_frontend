import { api } from './client.js';

export { api } from './client.js';
export { authApi } from './auth.js';
export { citizensApi } from './citizens.js';

export const usersApi = {
  list: (params) => api.get('/users', { params }).then((r) => r.data),
  get: (id) => api.get(`/users/${id}`).then((r) => r.data),
  create: (payload) => api.post('/users', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/users/${id}`),
};

export const rolesApi = {
  list: () => api.get('/roles').then((r) => r.data),
  create: (payload) => api.post('/roles', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/roles/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/roles/${id}`),
};

export const permissionsApi = {
  list: () => api.get('/permissions').then((r) => r.data),
};

export const supportsApi = {
  programs: () => api.get('/supports/programs').then((r) => r.data),
  createProgram: (p) => api.post('/supports/programs', p).then((r) => r.data),
  updateProgram: (id, p) => api.put(`/supports/programs/${id}`, p).then((r) => r.data),
  deleteProgram: (id) => api.delete(`/supports/programs/${id}`),
  types: () => api.get('/supports/types').then((r) => r.data),
  createType: (p) => api.post('/supports/types', p).then((r) => r.data),
  updateType: (id, p) => api.put(`/supports/types/${id}`, p).then((r) => r.data),
  deleteType: (id) => api.delete(`/supports/types/${id}`),
  byCitizen: (id) => api.get(`/supports/citizens/${id}`).then((r) => r.data),
  assign: (p) => api.post('/supports/citizens', p).then((r) => r.data),
  updateAssignment: (id, p) => api.put(`/supports/citizens/${id}`, p).then((r) => r.data),
  removeAssignment: (id) => api.delete(`/supports/citizens/${id}`),
};

export const catalogsApi = {
  list: (type, opts = {}) => {
    const params = {};
    if (type) params.type = type;
    if (opts.includeInactive) params.include_inactive = true;
    return api.get('/catalogs', { params }).then((r) => r.data);
  },
  create: (p) => api.post('/catalogs', p).then((r) => r.data),
  update: (id, p) => api.put(`/catalogs/${id}`, p).then((r) => r.data),
  remove: (id) => api.delete(`/catalogs/${id}`),

  areas: () => api.get('/catalogs/operational-areas').then((r) => r.data),
  createArea: (p) => api.post('/catalogs/operational-areas', p).then((r) => r.data),
  updateArea: (id, p) => api.put(`/catalogs/operational-areas/${id}`, p).then((r) => r.data),
  deleteArea: (id) => api.delete(`/catalogs/operational-areas/${id}`),

  /** Servicios por área (`operational_area_offerings`). Por defecto solo activos. */
  areaOfferings: (areaId, opts = {}) =>
    api
      .get(`/catalogs/operational-areas/${areaId}/offerings`, {
        params: opts.includeInactive ? { include_inactive: true } : {},
      })
      .then((r) => r.data),
  createOffering: (areaId, p) =>
    api.post(`/catalogs/operational-areas/${areaId}/offerings`, p).then((r) => r.data),
  updateOffering: (areaId, offeringId, p) =>
    api
      .put(`/catalogs/operational-areas/${areaId}/offerings/${offeringId}`, p)
      .then((r) => r.data),

  colonias: () => api.get('/catalogs/colonias').then((r) => r.data),
  createColonia: (p) => api.post('/catalogs/colonias', p).then((r) => r.data),
  updateColonia: (id, p) => api.put(`/catalogs/colonias/${id}`, p).then((r) => r.data),
  deleteColonia: (id) => api.delete(`/catalogs/colonias/${id}`),

  /** Tabla fuente `secciones` (FK de `c_coordinates.IDSeccion`). */
  secciones: () => api.get('/catalogs/secciones').then((r) => r.data),
  createSeccion: (p) => api.post('/catalogs/secciones', p).then((r) => r.data),
  deleteSeccion: (id) => api.delete(`/catalogs/secciones/${id}`),

  /** Tabla fuente `territoriales`. */
  territoriales: () => api.get('/catalogs/territoriales').then((r) => r.data),
  createTerritorial: (p) => api.post('/catalogs/territoriales', p).then((r) => r.data),
  updateTerritorial: (id, p) =>
    api.put(`/catalogs/territoriales/${id}`, p).then((r) => r.data),
  deleteTerritorial: (id) => api.delete(`/catalogs/territoriales/${id}`),
};

export const servicesApi = {
  list: (params) => api.get('/services', { params }).then((r) => r.data),
  get: (id) => api.get(`/services/${id}`).then((r) => r.data),
  create: (p) => api.post('/services', p).then((r) => r.data),
  update: (id, p) => api.put(`/services/${id}`, p).then((r) => r.data),
  changeStatus: (id, p) => api.patch(`/services/${id}/status`, p).then((r) => r.data),
};

export const surveysApi = {
  list: () => api.get('/surveys').then((r) => r.data),
  get: (id) => api.get(`/surveys/${id}`).then((r) => r.data),
  create: (p) => api.post('/surveys', p).then((r) => r.data),
  answer: (p) => api.post('/surveys/answers', p).then((r) => r.data),
};

export const mapsApi = {
  markers: (params) => api.get('/maps/markers', { params }).then((r) => r.data),
  sectionsGeoJson: () => api.get('/maps/sections/geojson').then((r) => r.data),
  serviceMarkers: (params) => api.get('/maps/service-markers', { params }).then((r) => r.data),
  programMarkers: (params) => api.get('/maps/program-markers', { params }).then((r) => r.data),
};

/** Autocompletado de direcciones vía backend (Google Places; clave en servidor). */
export const geoApi = {
  googleMapsReady: () => api.get('/geo/google-maps-ready').then((r) => r.data),
  googleAutocomplete: (input) =>
    api.get('/geo/places/autocomplete', { params: { input } }).then((r) => r.data),
  googlePlaceDetails: (place_id) =>
    api.get('/geo/places/details', { params: { place_id } }).then((r) => r.data),
};

export const logsApi = {
  list: (params) => api.get('/logs', { params }).then((r) => r.data),
};
