import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CitizenFichaPanel from '../components/CitizenFichaPanel.jsx';
import SlidePanel from '../components/SlidePanel.jsx';
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { catalogsApi, mapsApi, supportsApi } from '../api/index.js';

import 'leaflet/dist/leaflet.css';

/** Un solo canvas para polígonos: mucho más barato que miles de SVG paths. */
const SECTION_CANVAS_RENDERER = L.canvas({ padding: 0.5 });

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/** Teselas raster estilo Folium (sin Maps JavaScript API ni clave en el cliente). Puede cambiar según políticas de Google. */
const GOOGLE_RASTER_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

function getGoogleMapsBrowserKey() {
  return String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
}

function sectionHasTerritorial(seccion, territorialId) {
  if (!territorialId) return true;
  return (seccion.territorial_ids || []).map(Number).includes(Number(territorialId));
}

function featureHasTerritorial(feature, territorialId) {
  if (!territorialId) return true;
  const p = feature?.properties || {};
  const ids = Array.isArray(p.territorial_ids) ? p.territorial_ids.map(Number) : [];
  if (ids.length) return ids.includes(Number(territorialId));
  return Number(p.id_territorial) === Number(territorialId);
}

function featureHasDistrito(feature, distrito) {
  if (!distrito) return true;
  return Number(feature?.properties?.distrito) === Number(distrito);
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
        layer = L.gridLayer.googleMutant({ type: 'roadmap', maxZoom: 21, minZoom: 0 });
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
  weight: 1.5,
  fillColor: '#818cf8',
  fillOpacity: 0.14,
  renderer: SECTION_CANVAS_RENDERER,
};

const PROGRAM_MARKER_COLOR = '#7c3aed';

/** Clustering siempre activo (incluye filtro por sección) para no montar miles de Marker sueltos. */
const CLUSTER_OPTIONS = {
  chunkedLoading: true,
  chunkInterval: 50,
  chunkDelay: 25,
  maxClusterRadius: 80,
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  removeOutsideVisibleBounds: true,
};

const serviceIconCache = new Map();
const programIconCache = new Map();

const buildIcon = (color = '#753232') => {
  let icon = serviceIconCache.get(color);
  if (!icon) {
    icon = L.divIcon({
      className: '',
      html: `<div style="width:18px;height:18px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 0 0 1px ${color}"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    serviceIconCache.set(color, icon);
  }
  return icon;
};

const buildProgramMarkerIcon = (color = PROGRAM_MARKER_COLOR) => {
  let icon = programIconCache.get(color);
  if (!icon) {
    icon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;background:${color};border:2px solid white;border-radius:3px;box-shadow:0 0 0 1px ${color}"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    programIconCache.set(color, icon);
  }
  return icon;
};

const sectionStyleFn = () => SECTION_STYLE;

function DirectoryAuthPhoto({ kind, id, alt }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    let objectUrl = null;
    setUrl(null);
    if (!id) return undefined;
    const fetchPhoto = kind === 'enlace' ? mapsApi.enlacePhoto : mapsApi.promotorPhoto;
    fetchPhoto(id)
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        if (!alive) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setUrl(objectUrl);
      })
      .catch(() => {
        if (alive) setUrl(null);
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [kind, id]);

  if (!url) {
    return (
      <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
        Sin foto
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className="h-28 w-28 rounded-lg object-cover ring-1 ring-slate-200"
    />
  );
}

function DirectorySeccionPanel({ seccionCode }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['map-directory', seccionCode],
    queryFn: () => mapsApi.directoryBySeccion(seccionCode),
    enabled: Boolean(seccionCode),
  });

  if (isPending) {
    return <p className="text-sm text-slate-500">Cargando directorio…</p>;
  }
  if (isError || !data) {
    return <p className="text-sm text-slate-500">No se pudo cargar el directorio de esta sección.</p>;
  }
  if (!data.enlace && !data.promotor) {
    return (
      <p className="text-sm text-slate-500">
        Sin enlace ni promotor registrados para la sección {seccionCode}.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {data.colonia ? (
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">Colonia:</span> {data.colonia}
        </p>
      ) : null}

      {data.enlace ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enlace</h4>
          <div className="flex gap-3">
            {data.enlace.has_photo ? (
              <DirectoryAuthPhoto kind="enlace" id={data.enlace.id} alt={data.enlace.name} />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                Sin foto
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{data.enlace.name}</p>
            </div>
          </div>
        </section>
      ) : null}

      {data.promotor ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Promotor</h4>
          <div className="flex gap-3">
            {data.promotor.has_photo ? (
              <DirectoryAuthPhoto
                kind="promotor"
                id={data.promotor.id}
                alt={data.promotor.name}
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                Sin foto
              </div>
            )}
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-slate-900">{data.promotor.name}</p>
              {data.promotor.phone ? (
                <p className="text-sm text-slate-600">{data.promotor.phone}</p>
              ) : null}
              {data.promotor.email ? (
                <p className="break-all text-sm text-slate-600">{data.promotor.email}</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Tinte suave a partir de un hex (#rgb / #rrggbb) para sombrear filas de apoyos. */
function hexToTint(hex, alpha = 0.22) {
  const raw = String(hex || '').replace('#', '').trim();
  if (!raw) return `rgba(124, 58, 237, ${alpha})`;
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(124, 58, 237, ${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Cache de bounds por referencia de features para no recorrer todos los vértices en cada render. */
const sectionBoundsCache = new WeakMap();

/** Rectángulo mínimo que contiene todos los anillos exteriores de las secciones (polígono “global” para encuadre). */
function boundsFromAllSectionPolygons(geoJson) {
  if (!geoJson?.features?.length) return null;
  const cached = sectionBoundsCache.get(geoJson.features);
  if (cached) return cached;

  const bounds = L.latLngBounds([]);

  const extendRing = (ring) => {
    if (!Array.isArray(ring)) return;
    // Muestreo en anillos densos: basta para encuadre, evita O(n) completo en miles de vértices.
    const step = ring.length > 80 ? Math.ceil(ring.length / 40) : 1;
    for (let i = 0; i < ring.length; i += step) {
      const pt = ring[i];
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

  const result = bounds.isValid() ? bounds : null;
  if (result) sectionBoundsCache.set(geoJson.features, result);
  return result;
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

/** Acordeón simple para agrupar filtros del mapa sin amontonar la UI. */
function MapFilterAccordion({ title, hint, defaultOpen = false, badge, children }) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-slate-200 bg-white shadow-sm open:shadow-none"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <span className="text-sm font-medium text-slate-800">{title}</span>
          {hint ? <p className="text-xs text-slate-500 mt-0.5 truncate">{hint}</p> : null}
        </div>
        <span className="flex shrink-0 items-center gap-2 text-slate-400">
          {badge ? (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">
              {badge}
            </span>
          ) : null}
          <svg
            className="h-4 w-4 transition-transform group-open:rotate-180"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </summary>
      <div className="border-t border-slate-100 px-3 py-2.5">{children}</div>
    </details>
  );
}

export default function MapPage() {
  const { basemapMode, googleKey } = useMapBasemapConfig();

  const [mapFilters, setMapFilters] = useState({
    curp: '',
    status_code: '',
    municipio: '',
    distrito: '',
    territorial_id: '',
    seccion_electoral: '',
    colonia: '',
    direccion: '',
    operational_area_id: '',
    operational_area_offering_id: '',
    priority: '',
    program_id: '',
    support_type_id: '',
  });
  const [debouncedCurp, setDebouncedCurp] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedCurp(mapFilters.curp.trim()), 350);
    return () => clearTimeout(id);
  }, [mapFilters.curp]);

  const [debouncedSeccion, setDebouncedSeccion] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSeccion(mapFilters.seccion_electoral.trim()), 350);
    return () => clearTimeout(id);
  }, [mapFilters.seccion_electoral]);

  const [debouncedColonia, setDebouncedColonia] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedColonia(mapFilters.colonia.trim()), 350);
    return () => clearTimeout(id);
  }, [mapFilters.colonia]);

  const [debouncedDireccion, setDebouncedDireccion] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedDireccion(mapFilters.direccion.trim()), 350);
    return () => clearTimeout(id);
  }, [mapFilters.direccion]);

  const [debouncedMunicipio, setDebouncedMunicipio] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedMunicipio(mapFilters.municipio.trim()), 350);
    return () => clearTimeout(id);
  }, [mapFilters.municipio]);

  const [showSections, setShowSections] = useState(true);
  const [showServices, setShowServices] = useState(true);
  const [showPrograms, setShowPrograms] = useState(true);
  const [selectedCitizenId, setSelectedCitizenId] = useState(null);
  const [selectedDirectorySeccion, setSelectedDirectorySeccion] = useState(null);

  const filterAreaIdNum = mapFilters.operational_area_id
    ? Number(mapFilters.operational_area_id)
    : null;

  const sectionsQuery = useQuery({
    queryKey: ['map-sections-geojson'],
    queryFn: () => mapsApi.sectionsGeoJson(),
    staleTime: 5 * 60_000,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['catalogs', 'operational-areas'],
    queryFn: () => catalogsApi.areas(),
  });

  const { data: secciones = [] } = useQuery({
    queryKey: ['catalogs', 'secciones'],
    queryFn: () => catalogsApi.secciones(),
    staleTime: 120_000,
  });

  const { data: territoriales = [] } = useQuery({
    queryKey: ['catalogs', 'territoriales'],
    queryFn: () => catalogsApi.territoriales(),
    staleTime: 120_000,
  });

  const { data: colonias = [] } = useQuery({
    queryKey: ['catalogs', 'colonias'],
    queryFn: () => catalogsApi.colonias(),
    staleTime: 120_000,
  });

  const seccionesSorted = useMemo(
    () => [...secciones].sort((a, b) => a.id - b.id),
    [secciones],
  );

  const territorialesSorted = useMemo(
    () =>
      [...territoriales].sort((a, b) =>
        String(a.name || a.id).localeCompare(String(b.name || b.id), 'es'),
      ),
    [territoriales],
  );

  const coloniasSorted = useMemo(
    () =>
      [...colonias]
        .filter((c) => c.is_active !== false)
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es')),
    [colonias],
  );

  const filterDistritoNum = mapFilters.distrito ? Number(mapFilters.distrito) : null;
  const filterTerritorialIdNum = mapFilters.territorial_id
    ? Number(mapFilters.territorial_id)
    : null;

  const seccionIdSet = useMemo(
    () => new Set(seccionesSorted.map((s) => String(s.id))),
    [seccionesSorted],
  );

  const { data: filterOfferings = [] } = useQuery({
    queryKey: ['catalogs', 'area-offerings-map', filterAreaIdNum],
    queryFn: () => catalogsApi.areaOfferings(filterAreaIdNum),
    enabled: Boolean(filterAreaIdNum),
  });

  const markerParams = useMemo(() => {
    const p = { limit: 5000 };
    if (debouncedCurp) p.curp = debouncedCurp;
    if (mapFilters.status_code) p.status_code = mapFilters.status_code;
    if (debouncedMunicipio) p.municipio = debouncedMunicipio;
    if (filterDistritoNum) p.distrito = filterDistritoNum;
    if (filterTerritorialIdNum) p.territorial_id = filterTerritorialIdNum;
    if (filterAreaIdNum) p.operational_area_id = filterAreaIdNum;
    if (mapFilters.operational_area_offering_id)
      p.operational_area_offering_id = Number(mapFilters.operational_area_offering_id);
    if (mapFilters.priority) p.priority = mapFilters.priority;
    if (debouncedSeccion) p.seccion_electoral = debouncedSeccion;
    if (debouncedColonia) p.colonia = debouncedColonia;
    if (debouncedDireccion) p.direccion = debouncedDireccion;
    return p;
  }, [
    debouncedCurp,
    debouncedSeccion,
    debouncedColonia,
    debouncedDireccion,
    debouncedMunicipio,
    mapFilters.status_code,
    mapFilters.operational_area_offering_id,
    mapFilters.priority,
    filterAreaIdNum,
    filterDistritoNum,
    filterTerritorialIdNum,
  ]);

  const servicesQuery = useQuery({
    queryKey: ['map-service-markers', markerParams],
    queryFn: () => mapsApi.serviceMarkers(markerParams),
    enabled: showServices,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
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

  const filterProgramIdNum = mapFilters.program_id ? Number(mapFilters.program_id) : null;
  const filterSupportTypeIdNum = mapFilters.support_type_id
    ? Number(mapFilters.support_type_id)
    : null;

  const programTypesFiltered = useMemo(() => {
    if (!filterProgramIdNum) return supportTypes;
    return supportTypes.filter((t) => t.program_id === filterProgramIdNum);
  }, [supportTypes, filterProgramIdNum]);

  const programMarkerParams = useMemo(() => {
    const p = { limit: 5000 };
    if (debouncedCurp) p.curp = debouncedCurp;
    if (debouncedMunicipio) p.municipio = debouncedMunicipio;
    if (filterDistritoNum) p.distrito = filterDistritoNum;
    if (filterTerritorialIdNum) p.territorial_id = filterTerritorialIdNum;
    if (debouncedSeccion) p.seccion_electoral = debouncedSeccion;
    if (debouncedColonia) p.colonia = debouncedColonia;
    if (debouncedDireccion) p.direccion = debouncedDireccion;
    if (filterProgramIdNum) p.program_id = filterProgramIdNum;
    if (filterSupportTypeIdNum) p.support_type_id = filterSupportTypeIdNum;
    return p;
  }, [
    debouncedCurp,
    debouncedSeccion,
    debouncedColonia,
    debouncedDireccion,
    debouncedMunicipio,
    filterDistritoNum,
    filterTerritorialIdNum,
    filterProgramIdNum,
    filterSupportTypeIdNum,
  ]);

  const programsMapQuery = useQuery({
    queryKey: ['map-program-markers', programMarkerParams],
    queryFn: () => mapsApi.programMarkers(programMarkerParams),
    enabled: showPrograms,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const statsParams = useMemo(() => {
    const p = {};
    if (debouncedCurp) p.curp = debouncedCurp;
    if (mapFilters.status_code) p.status_code = mapFilters.status_code;
    if (debouncedMunicipio) p.municipio = debouncedMunicipio;
    if (filterDistritoNum) p.distrito = filterDistritoNum;
    if (filterTerritorialIdNum) p.territorial_id = filterTerritorialIdNum;
    if (debouncedSeccion) p.seccion_electoral = debouncedSeccion;
    if (debouncedColonia) p.colonia = debouncedColonia;
    if (debouncedDireccion) p.direccion = debouncedDireccion;
    if (filterAreaIdNum) p.operational_area_id = filterAreaIdNum;
    if (mapFilters.operational_area_offering_id)
      p.operational_area_offering_id = Number(mapFilters.operational_area_offering_id);
    if (mapFilters.priority) p.priority = mapFilters.priority;
    if (filterProgramIdNum) p.program_id = filterProgramIdNum;
    if (filterSupportTypeIdNum) p.support_type_id = filterSupportTypeIdNum;
    return p;
  }, [
    debouncedCurp,
    debouncedSeccion,
    debouncedColonia,
    debouncedDireccion,
    debouncedMunicipio,
    mapFilters.status_code,
    mapFilters.operational_area_offering_id,
    mapFilters.priority,
    filterAreaIdNum,
    filterDistritoNum,
    filterTerritorialIdNum,
    filterProgramIdNum,
    filterSupportTypeIdNum,
  ]);

  const statsQuery = useQuery({
    queryKey: ['map-stats', statsParams],
    queryFn: () => mapsApi.stats(statsParams),
    staleTime: 15_000,
  });

  const hasActiveFilters =
    Boolean(debouncedCurp) ||
    Boolean(mapFilters.status_code) ||
    Boolean(debouncedMunicipio || mapFilters.municipio.trim()) ||
    Boolean(filterDistritoNum) ||
    Boolean(filterTerritorialIdNum) ||
    Boolean(debouncedSeccion) ||
    Boolean(mapFilters.seccion_electoral.trim()) ||
    Boolean(debouncedColonia || mapFilters.colonia.trim()) ||
    Boolean(debouncedDireccion || mapFilters.direccion.trim()) ||
    Boolean(filterAreaIdNum) ||
    Boolean(mapFilters.operational_area_offering_id) ||
    Boolean(mapFilters.priority) ||
    Boolean(filterProgramIdNum) ||
    Boolean(filterSupportTypeIdNum);

  const locationFilterCount =
    Number(Boolean(debouncedCurp || mapFilters.curp.trim())) +
    Number(Boolean(debouncedMunicipio || mapFilters.municipio.trim())) +
    Number(Boolean(filterDistritoNum)) +
    Number(Boolean(filterTerritorialIdNum)) +
    Number(Boolean(debouncedSeccion || mapFilters.seccion_electoral.trim())) +
    Number(Boolean(debouncedColonia || mapFilters.colonia.trim())) +
    Number(Boolean(debouncedDireccion || mapFilters.direccion.trim()));
  const serviceFilterCount =
    Number(Boolean(mapFilters.status_code)) +
    Number(Boolean(filterAreaIdNum)) +
    Number(Boolean(mapFilters.operational_area_offering_id)) +
    Number(Boolean(mapFilters.priority));
  const programFilterCount =
    Number(Boolean(filterProgramIdNum)) + Number(Boolean(filterSupportTypeIdNum));

  const clearMapFilters = () => {
    setMapFilters({
      curp: '',
      status_code: '',
      municipio: '',
      distrito: '',
      territorial_id: '',
      seccion_electoral: '',
      colonia: '',
      direccion: '',
      operational_area_id: '',
      operational_area_offering_id: '',
      priority: '',
      program_id: '',
      support_type_id: '',
    });
    setDebouncedCurp('');
    setDebouncedSeccion('');
    setDebouncedColonia('');
    setDebouncedDireccion('');
    setDebouncedMunicipio('');
  };

  const serviceMarkers = useMemo(() => servicesQuery.data?.markers ?? [], [servicesQuery.data]);
  const mapProgramMarkers = useMemo(
    () => programsMapQuery.data?.markers ?? [],
    [programsMapQuery.data],
  );
  const sectionsGeo = sectionsQuery.data;
  const sectionInput = mapFilters.seccion_electoral.trim();
  const sectionFilter = debouncedSeccion;
  const sectionFilterNum = sectionFilter ? Number(sectionFilter) : null;
  const sectionInputPending = Boolean(sectionInput) && sectionInput !== sectionFilter;

  const distritosSorted = useMemo(() => {
    const ids = [
      ...new Set(seccionesSorted.map((s) => s.distrito).filter((d) => d != null)),
    ];
    return ids.sort((a, b) => a - b);
  }, [seccionesSorted]);

  const territorialesForFilters = useMemo(() => {
    if (!filterDistritoNum) return territorialesSorted;
    const allowed = new Set();
    for (const s of seccionesSorted) {
      if (s.distrito === filterDistritoNum) {
        for (const id of s.territorial_ids || []) allowed.add(Number(id));
      }
    }
    return territorialesSorted.filter((t) => allowed.has(Number(t.id)));
  }, [filterDistritoNum, seccionesSorted, territorialesSorted]);

  const seccionesForTerritorial = useMemo(() => {
    return seccionesSorted.filter((s) => {
      if (filterDistritoNum && s.distrito !== filterDistritoNum) return false;
      if (filterTerritorialIdNum && !sectionHasTerritorial(s, filterTerritorialIdNum)) {
        return false;
      }
      return true;
    });
  }, [filterDistritoNum, filterTerritorialIdNum, seccionesSorted]);

  const visibleSectionsGeo = useMemo(() => {
    if (!sectionsGeo?.features?.length) return sectionsGeo;

    let features = sectionsGeo.features;
    if (filterDistritoNum) {
      features = features.filter((f) => featureHasDistrito(f, filterDistritoNum));
    }
    if (filterTerritorialIdNum) {
      features = features.filter((f) => featureHasTerritorial(f, filterTerritorialIdNum));
    }
    if (sectionFilter) {
      features = features.filter((f) => {
        const p = f.properties || {};
        return (
          String(p.code ?? '') === sectionFilter ||
          p.seccion_id === sectionFilterNum ||
          p.id_seccion === sectionFilterNum
        );
      });
    }

    return { ...sectionsGeo, features };
  }, [sectionsGeo, sectionFilter, sectionFilterNum, filterDistritoNum, filterTerritorialIdNum]);

  const stats = statsQuery.data;
  const groupLevelLabel =
    stats?.group_level === 'colonia'
      ? 'por colonia'
      : stats?.group_level === 'seccion'
        ? 'por sección'
        : 'por territorial';

  const fmtStat = (n) =>
    Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 });

  const sectionCount = sectionsGeo?.features?.length ?? 0;
  const visibleSectionCount = visibleSectionsGeo?.features?.length ?? 0;
  const sectionInputUnknown =
    Boolean(sectionFilter) && !seccionIdSet.has(sectionFilter) && visibleSectionCount === 0;
  const showSectionPolygons =
    Boolean(sectionFilter) ||
    Boolean(filterDistritoNum) ||
    Boolean(filterTerritorialIdNum) ||
    (showSections && visibleSectionCount > 0);

  const geoJsonKey = useMemo(() => {
    if (!visibleSectionsGeo?.features?.length) return 'empty';
    return `sections-s${sectionFilter || 'all'}-d${filterDistritoNum || ''}-t${filterTerritorialIdNum || ''}-n${visibleSectionCount}`;
  }, [
    visibleSectionsGeo,
    visibleSectionCount,
    sectionFilter,
    filterDistritoNum,
    filterTerritorialIdNum,
  ]);

  const onSelectCitizen = useCallback((citizenId) => {
    setSelectedCitizenId(citizenId);
  }, []);

  const onSelectDirectorySeccion = useCallback((code) => {
    if (!code) return;
    setSelectedDirectorySeccion(String(code));
  }, []);

  const bindSectionDirectory = useCallback(
    (feature, layer) => {
      const p = feature.properties || {};
      const code = p.code ?? p.seccion_id ?? p.id_seccion;
      layer.bindTooltip(`Sección ${code ?? ''}`, { sticky: true });
      layer.on('click', () => onSelectDirectorySeccion(code));
    },
    [onSelectDirectorySeccion],
  );

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
              ? ` · ${mapProgramMarkers.length} ciudadanos con programas geolocalizados`
              : ' · capa de programas oculta'}
            {showSectionPolygons
              ? sectionFilter
                ? ` · sección ${sectionFilter}${visibleSectionCount ? '' : ' (sin polígono)'}`
                : ` · ${sectionCount} polígonos de sección`
              : ''}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <section className="card space-y-2.5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-800">Filtros del mapa</h3>
              <p className="text-sm text-slate-500">Territorial → sección → colonia</p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                className="text-sm text-brand-700 hover:underline self-start"
                onClick={clearMapFilters}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="space-y-2">
            <MapFilterAccordion
              title="Ubicación y ciudadano"
              hint="CURP, municipio, distrito, territorial, sección, colonia, dirección"
              defaultOpen={locationFilterCount > 0}
              badge={
                locationFilterCount
                  ? `${locationFilterCount} activo${locationFilterCount === 1 ? '' : 's'}`
                  : null
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                  <label className="label">Municipio</label>
                  <input
                    className="input"
                    placeholder="Domicilio principal"
                    value={mapFilters.municipio}
                    onChange={(e) => setMapFilters((f) => ({ ...f, municipio: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="map-filter-distrito">
                    Distrito
                  </label>
                  <select
                    id="map-filter-distrito"
                    className="input"
                    value={mapFilters.distrito}
                    onChange={(e) =>
                      setMapFilters((f) => ({
                        ...f,
                        distrito: e.target.value,
                        territorial_id: '',
                        seccion_electoral: '',
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    {distritosSorted.map((d) => (
                      <option key={d} value={d}>
                        Distrito {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="map-filter-territorial">
                    Territorial
                  </label>
                  <select
                    id="map-filter-territorial"
                    className="input"
                    value={mapFilters.territorial_id}
                    onChange={(e) =>
                      setMapFilters((f) => ({
                        ...f,
                        territorial_id: e.target.value,
                        seccion_electoral: '',
                      }))
                    }
                  >
                    <option value="">Todas</option>
                    {territorialesForFilters.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name || `Territorial ${t.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="map-filter-seccion">
                    Sección electoral
                  </label>
                  <input
                    id="map-filter-seccion"
                    className="input"
                    list="map-secciones-datalist"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="5463"
                    value={mapFilters.seccion_electoral}
                    onChange={(e) =>
                      setMapFilters((f) => ({
                        ...f,
                        seccion_electoral: e.target.value.replace(/\D/g, ''),
                      }))
                    }
                  />
                  <datalist id="map-secciones-datalist">
                    {seccionesForTerritorial.map((s) => (
                      <option key={s.id} value={String(s.id)} />
                    ))}
                  </datalist>
                  {sectionInputPending ? (
                    <p className="mt-1 text-xs text-slate-400">Filtrando…</p>
                  ) : sectionInputUnknown ? (
                    <p className="mt-1 text-xs text-amber-700">Sección no encontrada</p>
                  ) : null}
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="map-filter-colonia">
                    Colonia
                  </label>
                  <input
                    id="map-filter-colonia"
                    className="input"
                    list="map-colonias-datalist"
                    placeholder="Coincidencia parcial"
                    value={mapFilters.colonia}
                    onChange={(e) => setMapFilters((f) => ({ ...f, colonia: e.target.value }))}
                  />
                  <datalist id="map-colonias-datalist">
                    {coloniasSorted.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="map-filter-direccion">
                    Dirección (calle / número)
                  </label>
                  <input
                    id="map-filter-direccion"
                    className="input"
                    placeholder="Ej. Sur 16 o 245"
                    value={mapFilters.direccion}
                    onChange={(e) => setMapFilters((f) => ({ ...f, direccion: e.target.value }))}
                  />
                </div>
              </div>
            </MapFilterAccordion>

            <MapFilterAccordion
              title="Servicios operativos"
              hint="Estatus, área, catálogo y prioridad"
              defaultOpen={serviceFilterCount > 0}
              badge={
                serviceFilterCount
                  ? `${serviceFilterCount} activo${serviceFilterCount === 1 ? '' : 's'}`
                  : null
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
            </MapFilterAccordion>

            <MapFilterAccordion
              title="Programas y apoyos"
              hint="Programa o tipo de apoyo"
              defaultOpen={programFilterCount > 0}
              badge={
                programFilterCount
                  ? `${programFilterCount} activo${programFilterCount === 1 ? '' : 's'}`
                  : null
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="label">Programa</label>
                  <select
                    className="input"
                    value={mapFilters.program_id}
                    onChange={(e) =>
                      setMapFilters((f) => ({
                        ...f,
                        program_id: e.target.value,
                        support_type_id: '',
                      }))
                    }
                  >
                    <option value="">Todos los programas</option>
                    {supportPrograms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tipo de apoyo</label>
                  <select
                    className="input"
                    value={mapFilters.support_type_id}
                    disabled={!programTypesFiltered.length}
                    onChange={(e) =>
                      setMapFilters((f) => ({ ...f, support_type_id: e.target.value }))
                    }
                  >
                    <option value="">
                      {filterProgramIdNum ? 'Todos en el programa' : 'Todos los tipos'}
                    </option>
                    {programTypesFiltered.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </MapFilterAccordion>
          </div>
        </section>

        <section className="card space-y-3 p-4 lg:max-h-[min(28rem,55vh)] lg:overflow-y-auto">
          <div>
            <h3 className="font-semibold text-slate-800">Resumen estadístico</h3>
            <p className="text-sm text-slate-500">
              {statsQuery.isPending
                ? 'Calculando totales…'
                : `${fmtStat(stats?.citizens)} civ. · ${fmtStat(stats?.services)} svc. · ${fmtStat(stats?.supports)} apoyos`}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 py-2.5 px-3">
              <p className="text-xs text-slate-500">Ciudadanos</p>
              <p className="text-lg font-semibold text-slate-800">
                {statsQuery.isPending ? '…' : fmtStat(stats?.citizens)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 py-2.5 px-3">
              <p className="text-xs text-slate-500">Servicios</p>
              <p className="text-lg font-semibold text-slate-800">
                {statsQuery.isPending ? '…' : fmtStat(stats?.services)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 py-2.5 px-3">
              <p className="text-xs text-slate-500">Apoyos</p>
              <p className="text-lg font-semibold text-slate-800">
                {statsQuery.isPending ? '…' : fmtStat(stats?.supports)}
              </p>
            </div>
          </div>

          {(stats?.by_status?.length > 0 || stats?.by_program?.length > 0) && (
            <div className="grid grid-cols-1 gap-2.5">
              {stats?.by_status?.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-slate-100">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <h4 className="text-sm font-semibold text-slate-700">Servicios por estatus</h4>
                  </div>
                  <ul className="divide-y divide-slate-100 text-sm">
                    {stats.by_status.map((row) => (
                      <li
                        key={row.status_code}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <span className="inline-flex items-center gap-2 text-slate-700">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: STATUS_HEX[row.status_code] || '#753232' }}
                          />
                          {String(row.status_code).replace(/_/g, ' ')}
                        </span>
                        <span className="font-medium text-slate-800">{fmtStat(row.count)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {stats?.by_program?.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-slate-100">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <h4 className="text-sm font-semibold text-slate-700">Apoyos por programa</h4>
                    <p className="text-xs text-slate-500">Clic para filtrar el mapa</p>
                  </div>
                  <ul className="divide-y divide-slate-100/80 text-sm">
                    {stats.by_program.map((row) => {
                      const color = row.color || PROGRAM_MARKER_COLOR;
                      const programId = row.program_id != null ? String(row.program_id) : '';
                      const selected =
                        Boolean(programId) && String(mapFilters.program_id) === programId;
                      return (
                        <li key={row.program_id ?? row.program_name}>
                          <button
                            type="button"
                            disabled={!programId}
                            title={
                              selected
                                ? 'Quitar filtro de programa'
                                : 'Filtrar mapa por este programa'
                            }
                            onClick={() => {
                              if (!programId) return;
                              setShowPrograms(true);
                              setMapFilters((f) => ({
                                ...f,
                                program_id: f.program_id === programId ? '' : programId,
                                support_type_id: '',
                              }));
                            }}
                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:brightness-95 disabled:cursor-default ${
                              selected ? 'ring-2 ring-inset ring-brand-600' : ''
                            }`}
                            style={{
                              background: hexToTint(color, selected ? 0.38 : 0.2),
                              borderLeft: `4px solid ${color}`,
                            }}
                          >
                            <span className="min-w-0 truncate font-medium text-slate-800">
                              {row.program_name}
                            </span>
                            <span className="shrink-0 font-semibold text-slate-900">
                              {fmtStat(row.count)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
              <h4 className="text-sm font-semibold text-slate-700">Desglose {groupLevelLabel}</h4>
              <span className="text-xs text-slate-500">
                {statsQuery.isPending
                  ? 'Calculando…'
                  : `${fmtStat(stats?.groups?.length || 0)} grupo${(stats?.groups?.length || 0) === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="max-h-48 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-medium">
                      {stats?.group_level === 'colonia'
                        ? 'Colonia'
                        : stats?.group_level === 'seccion'
                          ? 'Sección'
                          : 'Territorial'}
                    </th>
                    <th className="px-3 py-2 font-medium text-right">Ciudadanos</th>
                    <th className="px-3 py-2 font-medium text-right">Servicios</th>
                    <th className="px-3 py-2 font-medium text-right">Apoyos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(stats?.groups ?? []).length ? (
                    stats.groups.map((g) => (
                      <tr key={g.key}>
                        <td className="px-3 py-2 text-slate-800">{g.label}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{fmtStat(g.citizens)}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{fmtStat(g.services)}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{fmtStat(g.supports)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                        {statsQuery.isPending
                          ? 'Cargando resumen…'
                          : 'Sin datos geolocalizados para el filtro actual.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div
        className="card relative overflow-hidden p-0"
        style={{ height: 'calc(100vh - 220px)', minHeight: 360 }}
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
          minZoom={0}
          maxZoom={21}
          scrollWheelZoom={false}
          preferCanvas
          style={{ height: '100%', width: '100%' }}
        >
          <FitBoundsToSectionsEnvelope
            geoJson={visibleSectionsGeo}
            enabled={showSectionPolygons && visibleSectionCount > 0}
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
          {showSectionPolygons && visibleSectionCount > 0 && (
            <GeoJSON
              key={geoJsonKey}
              data={visibleSectionsGeo}
              style={sectionStyleFn}
              onEachFeature={bindSectionDirectory}
            />
          )}
          {showServices && (
            <MarkerClusterGroup {...CLUSTER_OPTIONS}>
              {serviceMarkers.map((m) => (
                <Marker
                  key={m.service_id}
                  position={[Number(m.latitud), Number(m.longitud)]}
                  icon={buildIcon(STATUS_HEX[m.status_code] || '#753232')}
                  eventHandlers={{
                    click: () => onSelectCitizen(m.citizen_id),
                  }}
                />
              ))}
            </MarkerClusterGroup>
          )}
          {showPrograms && (
            <MarkerClusterGroup {...CLUSTER_OPTIONS}>
              {mapProgramMarkers.map((m) => (
                <Marker
                  key={`prog-citizen-${m.citizen_id}`}
                  position={[Number(m.latitud), Number(m.longitud)]}
                  icon={buildProgramMarkerIcon(m.color || PROGRAM_MARKER_COLOR)}
                  eventHandlers={{
                    click: () => onSelectCitizen(m.citizen_id),
                  }}
                />
              ))}
            </MarkerClusterGroup>
          )}
        </MapContainer>
      </div>

      <SlidePanel
        open={Boolean(selectedDirectorySeccion)}
        title={
          selectedDirectorySeccion
            ? `Directorio · Sección ${selectedDirectorySeccion}`
            : 'Directorio'
        }
        placement="right"
        width="max-w-md"
        className="!max-h-[100dvh]"
        onClose={() => setSelectedDirectorySeccion(null)}
      >
        {selectedDirectorySeccion ? (
          <DirectorySeccionPanel seccionCode={selectedDirectorySeccion} />
        ) : null}
      </SlidePanel>

      <SlidePanel
        open={Boolean(selectedCitizenId)}
        title="Ficha del ciudadano"
        placement="right"
        width="max-w-3xl"
        className="!max-h-[100dvh]"
        onClose={() => setSelectedCitizenId(null)}
      >
        {selectedCitizenId ? (
          <CitizenFichaPanel
            citizenId={selectedCitizenId}
            programs={supportPrograms}
            supportTypes={supportTypes}
          />
        ) : null}
      </SlidePanel>
    </div>
  );
}
