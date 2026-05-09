import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Drawer } from 'antd';
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { catalogsApi, citizensApi, mapsApi, servicesApi, supportsApi } from '../api/index.js';

import 'leaflet/dist/leaflet.css';

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/** Teselas raster estilo Folium (sin Maps JavaScript API ni clave en el cliente). Puede cambiar según políticas de Google. */
const GOOGLE_RASTER_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

function getGoogleMapsBrowserKey() {
  return String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
}

/** `google-js`: API oficial con clave. `google-raster`: teselas XYZ como en muchos ejemplos de Folium, sin clave. */
function useMapBasemapConfig() {
  const googleKey = getGoogleMapsBrowserKey();
  return googleKey
    ? { basemapMode: 'google-js', googleKey }
    : { basemapMode: 'google-raster', googleKey: '' };
}

const GMAPS_SCRIPT_ID = 'google-maps-js-api';

function loadGoogleMapsScript(apiKey) {
  if (typeof document === 'undefined') return Promise.reject(new Error('no document'));
  if (window.google?.maps?.Map) return Promise.resolve();

  const existing = document.getElementById(GMAPS_SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.google?.maps?.Map) {
        resolve();
        return;
      }
      const onLoad = () => resolve();
      const onErr = () => reject(new Error('Google Maps script error'));
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', onErr, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = GMAPS_SCRIPT_ID;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google Maps script failed'));
    document.head.appendChild(s);
  });
}

/** Capa base de Google (roadmap) vía leaflet.gridlayer.googlemutant; si falla, el padre debe mostrar OSM. */
function GoogleMapsMutantLayer({ apiKey }) {
  const map = useMap();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!apiKey) {
      setFailed(true);
      return undefined;
    }

    let cancelled = false;
    let layer = null;

    const run = async () => {
      try {
        window.L = L;
        await import('leaflet.gridlayer.googlemutant/dist/Leaflet.GoogleMutant.js');
        if (cancelled) return;
        if (typeof L.gridLayer?.googleMutant !== 'function') {
          throw new Error('GoogleMutant no registrado');
        }
        await loadGoogleMapsScript(apiKey);
        if (cancelled) return;
        layer = L.gridLayer.googleMutant({ type: 'roadmap' });
        layer.addTo(map);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (layer) {
        try {
          map.removeLayer(layer);
        } catch {
          /* noop */
        }
      }
    };
  }, [map, apiKey]);

  if (failed) {
    return (
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={OSM_TILE_URL}
      />
    );
  }

  return null;
}

const STATUSES = ['', 'PENDIENTE', 'EN_PROCESO', 'ATENDIDO', 'RECHAZADO'];
const PRIORITY_OPTIONS = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];

const STATUS_HEX = {
  PENDIENTE: '#d4a017',
  EN_PROCESO: '#2563eb',
  ATENDIDO: '#10b981',
  RECHAZADO: '#431616',
};

const SECTION_STYLE = {
  color: '#4338ca',
  weight: 2,
  fillColor: '#818cf8',
  fillOpacity: 0.18,
};

const SERVICE_STATUS_BADGE = {
  PENDIENTE: 'bg-accent-100 text-accent-800',
  EN_PROCESO: 'bg-blue-100 text-blue-800',
  ATENDIDO: 'bg-emerald-100 text-emerald-800',
  RECHAZADO: 'bg-brand-100 text-brand-800',
};

async function fetchAllServicesForCitizen(citizenId) {
  const page_size = 100;
  let page = 1;
  const items = [];
  let total = 0;
  /* eslint-disable no-await-in-loop -- páginas secuenciales según total del backend */
  for (;;) {
    const data = await servicesApi.list({ citizen_id: citizenId, page, page_size });
    items.push(...(data.items ?? []));
    total = data.total ?? items.length;
    if (!data.items?.length || data.items.length < page_size) break;
    page += 1;
    if (page > 100) break;
  }
  /* eslint-enable no-await-in-loop */
  return { items, total };
}

const buildIcon = (color = '#753232') =>
  L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 0 0 1px ${color}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const PROGRAM_MARKER_COLOR = '#7c3aed';

const buildProgramMarkerIcon = (color = PROGRAM_MARKER_COLOR) =>
  L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:${color};border:2px solid white;border-radius:3px;box-shadow:0 0 0 1px ${color}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

/** Rectángulo mínimo que contiene todos los anillos exteriores de las secciones (polígono “global” para encuadre). */
function boundsFromAllSectionPolygons(geoJson) {
  const bounds = L.latLngBounds([]);
  if (!geoJson?.features?.length) return null;

  const extendRing = (ring) => {
    if (!Array.isArray(ring)) return;
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) continue;
      const lng = Number(pt[0]);
      const lat = Number(pt[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) bounds.extend([lat, lng]);
    }
  };

  for (const f of geoJson.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon' && g.coordinates?.[0]) extendRing(g.coordinates[0]);
    else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates || []) {
        if (poly?.[0]) extendRing(poly[0]);
      }
    }
  }

  return bounds.isValid() ? bounds : null;
}

/** Encuadra el mapa solo al alcance conjunto de todas las secciones (sin centrar en ciudad fija). */
function FitBoundsToSectionsEnvelope({ geoJson, enabled, boundsTrigger }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !geoJson) return;
    const b = boundsFromAllSectionPolygons(geoJson);
    if (!b) return;
    map.fitBounds(b, { padding: [28, 28], maxZoom: 17 });
  }, [map, geoJson, enabled, boundsTrigger]);

  return null;
}

export default function MapPage() {
  const { basemapMode, googleKey } = useMapBasemapConfig();

  const [mapFilters, setMapFilters] = useState({
    curp: '',
    status_code: '',
    municipio: '',
    operational_area_id: '',
    operational_area_offering_id: '',
    priority: '',
  });
  const [debouncedCurp, setDebouncedCurp] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedCurp(mapFilters.curp.trim()), 350);
    return () => clearTimeout(id);
  }, [mapFilters.curp]);

  const [showSections, setShowSections] = useState(true);
  const [showServices, setShowServices] = useState(true);
  const [showPrograms, setShowPrograms] = useState(true);
  const [selectedCitizenId, setSelectedCitizenId] = useState(null);

  const filterAreaIdNum = mapFilters.operational_area_id
    ? Number(mapFilters.operational_area_id)
    : null;

  const sectionsQuery = useQuery({
    queryKey: ['map-sections-geojson'],
    queryFn: () => mapsApi.sectionsGeoJson(),
    staleTime: 60_000,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['catalogs', 'operational-areas'],
    queryFn: () => catalogsApi.areas(),
  });

  const { data: filterOfferings = [] } = useQuery({
    queryKey: ['catalogs', 'area-offerings-map', filterAreaIdNum],
    queryFn: () => catalogsApi.areaOfferings(filterAreaIdNum),
    enabled: Boolean(filterAreaIdNum),
  });

  const markerParams = useMemo(() => {
    const p = { limit: 5000 };
    if (debouncedCurp) p.curp = debouncedCurp;
    if (mapFilters.status_code) p.status_code = mapFilters.status_code;
    const m = mapFilters.municipio.trim();
    if (m) p.municipio = m;
    if (filterAreaIdNum) p.operational_area_id = filterAreaIdNum;
    if (mapFilters.operational_area_offering_id)
      p.operational_area_offering_id = Number(mapFilters.operational_area_offering_id);
    if (mapFilters.priority) p.priority = mapFilters.priority;
    return p;
  }, [
    debouncedCurp,
    mapFilters.status_code,
    mapFilters.municipio,
    mapFilters.operational_area_offering_id,
    mapFilters.priority,
    filterAreaIdNum,
  ]);

  const servicesQuery = useQuery({
    queryKey: ['map-service-markers', markerParams],
    queryFn: () => mapsApi.serviceMarkers(markerParams),
  });

  const programMarkerParams = useMemo(() => {
    const p = { limit: 5000 };
    if (debouncedCurp) p.curp = debouncedCurp;
    const m = mapFilters.municipio.trim();
    if (m) p.municipio = m;
    return p;
  }, [debouncedCurp, mapFilters.municipio]);

  const programsMapQuery = useQuery({
    queryKey: ['map-program-markers', programMarkerParams],
    queryFn: () => mapsApi.programMarkers(programMarkerParams),
    enabled: showPrograms,
  });

  const citizenDetailQuery = useQuery({
    queryKey: ['citizen', selectedCitizenId],
    queryFn: () => citizensApi.get(selectedCitizenId),
    enabled: Boolean(selectedCitizenId),
  });

  const citizenServicesQuery = useQuery({
    queryKey: ['services', 'map-citizen-panel', selectedCitizenId],
    queryFn: () => fetchAllServicesForCitizen(selectedCitizenId),
    enabled: Boolean(selectedCitizenId),
  });

  const citizenSupportsQuery = useQuery({
    queryKey: ['supports', selectedCitizenId],
    queryFn: () => supportsApi.byCitizen(selectedCitizenId),
    enabled: Boolean(selectedCitizenId),
  });

  const { data: supportPrograms = [] } = useQuery({
    queryKey: ['supports', 'programs'],
    queryFn: () => supportsApi.programs(),
    staleTime: 120_000,
  });

  const { data: supportTypes = [] } = useQuery({
    queryKey: ['supports', 'types'],
    queryFn: () => supportsApi.types(),
    staleTime: 120_000,
  });

  const programById = useMemo(() => {
    const m = new Map();
    supportPrograms.forEach((p) => m.set(p.id, p));
    return m;
  }, [supportPrograms]);

  const typeById = useMemo(() => {
    const m = new Map();
    supportTypes.forEach((t) => m.set(t.id, t));
    return m;
  }, [supportTypes]);

  const hasActiveFilters =
    Boolean(debouncedCurp) ||
    Boolean(mapFilters.status_code) ||
    Boolean(mapFilters.municipio.trim()) ||
    Boolean(filterAreaIdNum) ||
    Boolean(mapFilters.operational_area_offering_id) ||
    Boolean(mapFilters.priority);

  const clearMapFilters = () => {
    setMapFilters({
      curp: '',
      status_code: '',
      municipio: '',
      operational_area_id: '',
      operational_area_offering_id: '',
      priority: '',
    });
    setDebouncedCurp('');
  };

  const serviceMarkers = useMemo(() => servicesQuery.data?.markers ?? [], [servicesQuery.data]);
  const mapProgramMarkers = useMemo(
    () => programsMapQuery.data?.markers ?? [],
    [programsMapQuery.data],
  );
  const sectionsGeo = sectionsQuery.data;
  const sectionCount = sectionsGeo?.features?.length ?? 0;

  const geoJsonKey = useMemo(() => {
    if (!sectionsGeo?.features?.length) return 'empty';
    return `sections-${sectionCount}-${sectionsGeo.features[0]?.properties?.code ?? ''}`;
  }, [sectionsGeo, sectionCount]);

  /** Cuando cambian los datos de secciones (refetch o geometrías distintas), se recalcula el encuadre. */
  const boundsTrigger = `${geoJsonKey}:${sectionsQuery.dataUpdatedAt ?? 0}`;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mapa interactivo</h2>
          <p className="text-sm text-slate-500">
            {showServices
              ? `${serviceMarkers.length} servicios en domicilio geolocalizado`
              : 'Capa de servicios oculta'}
            {showPrograms
              ? ` · ${mapProgramMarkers.length} apoyos/programas geolocalizados`
              : ' · capa de programas oculta'}
            {showSections ? ` · ${sectionCount} polígonos de sección` : ''}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={showSections}
                onChange={(e) => setShowSections(e.target.checked)}
              />
              Secciones
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={showServices}
                onChange={(e) => setShowServices(e.target.checked)}
              />
              Servicios
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={showPrograms}
                onChange={(e) => setShowPrograms(e.target.checked)}
              />
              Programas
            </label>
          </div>
        </div>
      </header>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-800">Filtros del mapa</h3>
            <p className="text-sm text-slate-500">
              Mismos criterios que en Servicios: CURP, estatus, municipio, área, catálogo y prioridad.
            </p>
          </div>
          {hasActiveFilters && (
            <button type="button" className="text-sm text-brand-700 hover:underline self-start" onClick={clearMapFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div>
            <label className="label">CURP</label>
            <input
              className="input"
              placeholder="Coincidencia parcial"
              value={mapFilters.curp}
              onChange={(e) => setMapFilters((f) => ({ ...f, curp: e.target.value }))}
              autoCapitalize="characters"
            />
          </div>
          <div>
            <label className="label">Estatus</label>
            <select
              className="input"
              value={mapFilters.status_code}
              onChange={(e) => setMapFilters((f) => ({ ...f, status_code: e.target.value }))}
            >
              {STATUSES.map((s) => (
                <option key={s || 'all'} value={s}>
                  {s || 'Todos'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Municipio</label>
            <input
              className="input"
              placeholder="Domicilio principal"
              value={mapFilters.municipio}
              onChange={(e) => setMapFilters((f) => ({ ...f, municipio: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Área operativa</label>
            <select
              className="input"
              value={mapFilters.operational_area_id}
              onChange={(e) =>
                setMapFilters((f) => ({
                  ...f,
                  operational_area_id: e.target.value,
                  operational_area_offering_id: '',
                }))
              }
            >
              <option value="">Todas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Servicio (catálogo)</label>
            <select
              className="input"
              value={mapFilters.operational_area_offering_id}
              disabled={!filterAreaIdNum}
              onChange={(e) =>
                setMapFilters((f) => ({ ...f, operational_area_offering_id: e.target.value }))
              }
            >
              <option value="">Todos en el área</option>
              {filterOfferings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Prioridad</label>
            <select
              className="input"
              value={mapFilters.priority}
              onChange={(e) => setMapFilters((f) => ({ ...f, priority: e.target.value }))}
            >
              <option value="">Todas</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="legend flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
        <span className="font-medium text-slate-700">Leyenda estatus:</span>
        {Object.entries(STATUS_HEX).map(([code, hex]) => (
          <span key={code} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-white shadow" style={{ background: hex }} />
            {code.replace('_', ' ')}
          </span>
        ))}
        <span className="mx-1 text-slate-300">|</span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border border-white shadow"
            style={{ background: PROGRAM_MARKER_COLOR }}
          />
          Apoyo / programa
        </span>
      </div>

      <div
        className="card relative overflow-hidden p-0"
        style={{ height: 'calc(100vh - 280px)', minHeight: 360 }}
      >
        {(sectionsQuery.isPending ||
          servicesQuery.isPending ||
          (showPrograms && programsMapQuery.isPending)) && (
          <div className="absolute left-4 top-4 z-[500] rounded-md bg-white/95 px-3 py-2 text-sm text-slate-600 shadow">
            Cargando capas…
          </div>
        )}
        <MapContainer
          center={[19.4326, -99.1332]}
          zoom={11}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <FitBoundsToSectionsEnvelope
            geoJson={sectionsGeo}
            enabled={showSections && sectionCount > 0}
            boundsTrigger={boundsTrigger}
          />
          {basemapMode === 'google-js' ? (
            <GoogleMapsMutantLayer apiKey={googleKey} />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.google.com/maps">Google</a>'
              url={GOOGLE_RASTER_TILE_URL}
              subdomains="0123"
              maxZoom={20}
            />
          )}
          {showSections && sectionCount > 0 && (
            <GeoJSON
              key={geoJsonKey}
              data={sectionsGeo}
              style={() => SECTION_STYLE}
              onEachFeature={(feature, layer) => {
                const p = feature.properties || {};
                layer.bindPopup(
                  `<div style="font-size:12px;line-height:1.35"><strong>Sección ${p.code ?? ''}</strong><br />${p.name || ''}<br />${p.municipio || ''}</div>`,
                );
              }}
            />
          )}
          {showServices && (
            <MarkerClusterGroup chunkedLoading>
              {serviceMarkers.map((m) => (
                <Marker
                  key={m.service_id}
                  position={[Number(m.latitud), Number(m.longitud)]}
                  icon={buildIcon(STATUS_HEX[m.status_code] || '#753232')}
                  eventHandlers={{
                    click: () => setSelectedCitizenId(m.citizen_id),
                  }}
                />
              ))}
            </MarkerClusterGroup>
          )}
          {showPrograms && (
            <MarkerClusterGroup chunkedLoading>
              {mapProgramMarkers.map((m) => (
                <Marker
                  key={`prog-${m.support_id}`}
                  position={[Number(m.latitud), Number(m.longitud)]}
                  icon={buildProgramMarkerIcon()}
                  eventHandlers={{
                    click: () => setSelectedCitizenId(m.citizen_id),
                  }}
                />
              ))}
            </MarkerClusterGroup>
          )}
        </MapContainer>
      </div>

      <Drawer
        closable
        destroyOnHidden
        title={<p className="m-0">Ficha del ciudadano</p>}
        placement="right"
        width={760}
        open={Boolean(selectedCitizenId)}
        loading={citizenDetailQuery.isPending}
        styles={{ body: { overflow: 'hidden' } }}
        onClose={() => setSelectedCitizenId(null)}
      >
        <section className="flex h-full flex-col gap-6 overflow-hidden">
          {selectedCitizenId && (
            <>
            {citizenDetailQuery.isPending ? (
              <p className="text-sm text-slate-500">Cargando ciudadano…</p>
            ) : citizenDetailQuery.isError ? (
              <p className="text-sm text-red-600">No se pudo cargar el ciudadano.</p>
            ) : citizenDetailQuery.data ? (
              <div className="overflow-x-auto">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Ciudadano</h4>
                <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50/80">
                      <th className="text-left px-3 py-2 text-slate-500 font-medium w-40">Nombre completo</th>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {citizenDetailQuery.data.nombre} {citizenDetailQuery.data.apellido_paterno}{' '}
                        {citizenDetailQuery.data.apellido_materno || ''}
                      </td>
                    </tr>
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">CURP</th>
                      <td className="px-3 py-2 font-mono">{citizenDetailQuery.data.curp}</td>
                    </tr>
                    <tr className="bg-slate-50/80">
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Sexo</th>
                      <td className="px-3 py-2">{citizenDetailQuery.data.sexo}</td>
                    </tr>
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Nacimiento</th>
                      <td className="px-3 py-2">{citizenDetailQuery.data.fecha_nacimiento || '—'}</td>
                    </tr>
                    <tr className="bg-slate-50/80">
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Clave elector</th>
                      <td className="px-3 py-2">{citizenDetailQuery.data.clave_elector || '—'}</td>
                    </tr>
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Sección electoral</th>
                      <td className="px-3 py-2">{citizenDetailQuery.data.seccion_electoral || '—'}</td>
                    </tr>
                    <tr className="bg-slate-50/80">
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Teléfono</th>
                      <td className="px-3 py-2">{citizenDetailQuery.data.telefono || '—'}</td>
                    </tr>
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Correo</th>
                      <td className="px-3 py-2">{citizenDetailQuery.data.correo || '—'}</td>
                    </tr>
                    <tr className="bg-slate-50/80">
                      <th className="text-left px-3 py-2 text-slate-500 font-medium align-top">Domicilio principal</th>
                      <td className="px-3 py-2">
                        {(() => {
                          const addrs = citizenDetailQuery.data.addresses ?? [];
                          const a = addrs.find((x) => x.is_primary) || addrs[0];
                          if (!a) return '—';
                          return (
                            <>
                              <span>
                                {a.calle || ''} {a.numero || ''}, {a.colonia || ''}
                              </span>
                              <br />
                              <span className="text-slate-600">
                                {a.municipio || ''}, {a.estado || ''} · CP {a.codigo_postal || '—'}
                              </span>
                            </>
                          );
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="min-h-0 overflow-hidden">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-700">Servicios operativos</h4>
                {citizenServicesQuery.data ? (
                  <span className="text-xs text-slate-500">
                    {citizenServicesQuery.data.total} registro{citizenServicesQuery.data.total === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>
              {citizenServicesQuery.isPending ? (
                <p className="text-sm text-slate-500">Cargando servicios…</p>
              ) : citizenServicesQuery.isError ? (
                <p className="text-sm text-red-600">No se pudieron cargar los servicios.</p>
              ) : (
                <div className="max-h-56 overflow-auto">
                  <table className="min-w-full text-sm border border-slate-200">
                    <thead className="text-left text-slate-600 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Servicio</th>
                        <th className="px-3 py-2">Catálogo</th>
                        <th className="px-3 py-2">Prioridad</th>
                        <th className="px-3 py-2">Estatus</th>
                        <th className="px-3 py-2">Alta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(citizenServicesQuery.data?.items ?? []).length ? (
                        citizenServicesQuery.data.items.map((s) => (
                          <tr key={s.id}>
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">#{s.id}</td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-800">{s.title}</div>
                              {s.description ? (
                                <div className="text-xs text-slate-500 line-clamp-2">{s.description}</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {s.operational_area_offering?.name || '—'}
                            </td>
                            <td className="px-3 py-2">{s.priority}</td>
                            <td className="px-3 py-2">
                              <span className={`badge ${SERVICE_STATUS_BADGE[s.status_code] || ''}`}>{s.status_code}</span>
                            </td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                              {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-3 py-6 text-slate-500 text-center" colSpan={6}>
                            Sin servicios registrados para este ciudadano.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="min-h-0 overflow-hidden">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Programas y apoyos</h4>
              {citizenSupportsQuery.isPending ? (
                <p className="text-sm text-slate-500">Cargando apoyos…</p>
              ) : citizenSupportsQuery.isError ? (
                <p className="text-sm text-red-600">No se pudieron cargar los apoyos.</p>
              ) : (
                <div className="max-h-56 overflow-auto">
                  <table className="min-w-full text-sm border border-slate-200">
                    <thead className="text-left text-slate-600 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Programa</th>
                        <th className="px-3 py-2">Tipo de apoyo</th>
                        <th className="px-3 py-2">Descripción</th>
                        <th className="px-3 py-2">Solicitado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(citizenSupportsQuery.data ?? []).length ? (
                        citizenSupportsQuery.data.map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">#{row.id}</td>
                            <td className="px-3 py-2">
                              {row.program_id != null
                                ? programById.get(row.program_id)?.name ?? `Programa #${row.program_id}`
                                : '—'}
                            </td>
                            <td className="px-3 py-2">
                              {row.support_type_id != null
                                ? typeById.get(row.support_type_id)?.name ?? `Tipo #${row.support_type_id}`
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              <div>{row.description || '—'}</div>
                              {row.notes ? (
                                <div className="text-xs text-slate-500 mt-0.5">Notas: {row.notes}</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                              {row.requested_at ? new Date(row.requested_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-3 py-6 text-slate-500 text-center" colSpan={5}>
                            Sin programas o apoyos asignados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            </>
          )}
        </section>
      </Drawer>
    </div>
  );
}
