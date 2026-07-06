import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { votingsApi } from '../../api/index.js';

import 'leaflet/dist/leaflet.css';

const GOOGLE_RASTER_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

const MARGIN_STYLES = {
  win: { color: '#047857', weight: 2, fillColor: '#10b981', fillOpacity: 0.58 },
  lose: { color: '#b91c1c', weight: 2, fillColor: '#ef4444', fillOpacity: 0.58 },
  tie: { color: '#64748b', weight: 2, fillColor: '#94a3b8', fillOpacity: 0.4 },
  nodata: { color: '#cbd5e1', weight: 1, fillColor: '#e2e8f0', fillOpacity: 0.25 },
  selected: { weight: 4 },
};

/** Colores aproximados por partido / coalición (MX). */
const PARTY_COLORS = {
  PAN: { fill: '#005494', stroke: '#003d6b' },
  PRI: { fill: '#008000', stroke: '#006600' },
  PRD: { fill: '#f7c600', stroke: '#b89600' },
  PVEM: { fill: '#006847', stroke: '#004d35' },
  PT: { fill: '#da291c', stroke: '#a81f15' },
  MC: { fill: '#ff6600', stroke: '#cc5200' },
  MORENA: { fill: '#9f2241', stroke: '#7a1a32' },
  ELIGE: { fill: '#7c3aed', stroke: '#5b21b6' },
  PES: { fill: '#0891b2', stroke: '#0e7490' },
  RSP: { fill: '#475569', stroke: '#334155' },
  FXM: { fill: '#64748b', stroke: '#475569' },
  'PAN-PRI-PRD': { fill: '#1d4ed8', stroke: '#1e3a8a' },
  'PAN-PRI': { fill: '#2563eb', stroke: '#1d4ed8' },
  'PAN-PRD': { fill: '#3b82f6', stroke: '#2563eb' },
  'PRI-PRD': { fill: '#16a34a', stroke: '#15803d' },
  'PT-MORENA': { fill: '#be123c', stroke: '#9f1239' },
  'PVEM-PT-MORENA': { fill: '#b91c1c', stroke: '#991b1b' },
  MORENA: { fill: '#9f2241', stroke: '#7a1a32' },
  OTRO: { fill: '#94a3b8', stroke: '#64748b' },
};

const PARTY_LEGEND_ORDER = [
  'MORENA',
  'PAN-PRI-PRD',
  'MC',
  'PAN',
  'PRI',
  'PRD',
  'MC',
  'PVEM',
  'PT',
  'PAN-PRI-PRD',
  'PVEM-PT-MORENA',
  'PT-MORENA',
  'ELIGE',
  'PES',
  'RSP',
  'FXM',
  'PAN-PRI',
  'PAN-PRD',
  'PRI-PRD',
];

function fmt(n) {
  if (n == null || n === '') return '—';
  return Number(n).toLocaleString('es-MX');
}

function pct(n) {
  if (n == null || n === '') return '—';
  const v = Number(n);
  if (Number.isNaN(v)) return '—';
  const normalized = v <= 1 ? v * 100 : v;
  return `${normalized.toFixed(2)}%`;
}

function resolveSeccionId(props = {}) {
  const raw = props.seccion_id ?? props.id_seccion ?? props.code;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function partyStyle(party, selected = false) {
  const colors = PARTY_COLORS[party] ?? PARTY_COLORS.OTRO;
  return {
    color: colors.stroke,
    weight: selected ? 4 : 2,
    fillColor: colors.fill,
    fillOpacity: 0.62,
  };
}

function boundsFromGeoJson(geoJson) {
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

function FitBounds({ geoJson, enabled }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !geoJson) return;
    const b = boundsFromGeoJson(geoJson);
    if (!b) return;
    map.fitBounds(b, { padding: [28, 28], maxZoom: 17 });
  }, [map, geoJson, enabled]);
  return null;
}

function buildMarginPopup(seccionId, voting) {
  if (!voting) {
    return `<div style="font-size:12px"><strong>Sección ${seccionId}</strong><br/>Sin datos de votación</div>`;
  }
  const status =
    voting.favor_status === 'win'
      ? 'A favor'
      : voting.favor_status === 'lose'
        ? 'En contra'
        : 'Empate';
  return `<div style="font-size:12px;line-height:1.45">
    <strong>Sección ${seccionId}</strong><br/>
    ${voting.coordinacion ? `${voting.coordinacion}<br/>` : ''}
    ${voting.colonia ? `${voting.colonia}<br/>` : ''}
    <strong>${status}</strong><br/>
    Nosotros: ${fmt(voting.nosotros)} (${pct(voting.pct_nosotros)})<br/>
    Ellos: ${fmt(voting.ellos)} (${pct(voting.pct_ellos)})<br/>
    A favor: ${fmt(voting.a_favor)}<br/>
    Total votos: ${fmt(voting.total_votos)}
  </div>`;
}

function buildPartyPopup(seccionId, voting) {
  if (!voting?.leading_party) {
    return `<div style="font-size:12px"><strong>Sección ${seccionId}</strong><br/>Sin datos de partido</div>`;
  }
  const rows = Object.entries(voting.party_votes ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([party, votes]) => `${party}: ${fmt(votes)}`)
    .join('<br/>');
  return `<div style="font-size:12px;line-height:1.45">
    <strong>Sección ${seccionId}</strong><br/>
    ${voting.coordinacion ? `${voting.coordinacion}<br/>` : ''}
    ${voting.colonia ? `${voting.colonia}<br/>` : ''}
    <strong>Líder: ${voting.leading_party}</strong> (${pct(voting.leading_party_pct)})<br/>
    Votos: ${fmt(voting.leading_party_votes)}<br/>
    <hr style="margin:6px 0;border:none;border-top:1px solid #e2e8f0"/>
    ${rows}
  </div>`;
}

export default function VotingMapPage({ year, title, subtitle }) {
  const [seccionFilter, setSeccionFilter] = useState('');
  const [layerMode, setLayerMode] = useState('margin');

  const mapSectionsQuery = useQuery({
    queryKey: ['votings', year, 'map-sections'],
    queryFn: year === 2021 ? votingsApi.mapSections2021 : votingsApi.mapSections2024,
  });

  const summaryQuery = useQuery({
    queryKey: ['votings', year, 'summary'],
    queryFn: year === 2021 ? votingsApi.summary2021 : votingsApi.summary2024,
  });

  const sectionsGeoQuery = useQuery({
    queryKey: ['votings', 'sections-geojson'],
    queryFn: () => votingsApi.sectionsGeoJson(),
  });

  const votingBySeccion = useMemo(() => {
    const map = new Map();
    for (const row of mapSectionsQuery.data ?? []) {
      map.set(row.seccion_id, row);
    }
    return map;
  }, [mapSectionsQuery.data]);

  const counts = useMemo(() => {
    let win = 0;
    let lose = 0;
    let tie = 0;
    for (const row of mapSectionsQuery.data ?? []) {
      if (row.favor_status === 'win') win += 1;
      else if (row.favor_status === 'lose') lose += 1;
      else tie += 1;
    }
    return { win, lose, tie };
  }, [mapSectionsQuery.data]);

  const partyCounts = useMemo(() => {
    const tally = {};
    for (const row of mapSectionsQuery.data ?? []) {
      if (!row.leading_party) continue;
      tally[row.leading_party] = (tally[row.leading_party] ?? 0) + 1;
    }
    return tally;
  }, [mapSectionsQuery.data]);

  const activeParties = useMemo(() => {
    const present = new Set(Object.keys(partyCounts));
    const ordered = PARTY_LEGEND_ORDER.filter((p) => present.has(p));
    for (const p of present) {
      if (!ordered.includes(p)) ordered.push(p);
    }
    return ordered;
  }, [partyCounts]);

  const filterNum = seccionFilter ? Number(seccionFilter) : null;

  const enrichedGeoJson = useMemo(() => {
    const base = sectionsGeoQuery.data;
    if (!base?.features) return base;

    const features = base.features
      .map((feature) => {
        const seccionId = resolveSeccionId(feature.properties);
        const voting = seccionId != null ? votingBySeccion.get(seccionId) : null;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            seccion_id: seccionId,
            voting,
            favor_status: voting?.favor_status ?? 'nodata',
            leading_party: voting?.leading_party ?? null,
          },
        };
      })
      .filter((feature) => {
        if (!filterNum) return true;
        return feature.properties?.seccion_id === filterNum;
      });

    return { ...base, features };
  }, [sectionsGeoQuery.data, votingBySeccion, filterNum]);

  const styleFeature = (feature) => {
    const seccionId = resolveSeccionId(feature?.properties);
    const selected = filterNum && seccionId === filterNum;
    const voting = feature?.properties?.voting;

    if (layerMode === 'party') {
      if (!voting?.leading_party) {
        return { ...MARGIN_STYLES.nodata, weight: selected ? 4 : 1 };
      }
      return partyStyle(voting.leading_party, selected);
    }

    const status = feature?.properties?.favor_status ?? 'nodata';
    const base = MARGIN_STYLES[status] ?? MARGIN_STYLES.nodata;
    if (selected) return { ...base, ...MARGIN_STYLES.selected };
    return base;
  };

  const buildPopup = (seccionId, voting) =>
    layerMode === 'party'
      ? buildPartyPopup(seccionId, voting)
      : buildMarginPopup(seccionId, voting);

  const loading =
    mapSectionsQuery.isPending || sectionsGeoQuery.isPending || summaryQuery.isPending;

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Votación — {title}</h2>
        <p className="text-sm text-slate-500">
          {layerMode === 'party' && year === 2024
            ? 'Mapa por sección: color del bloque ganador (PAN-PRI-PRD, MORENA o MC) según votos totales de la sección.'
            : subtitle}
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryQuery.data && (
          <>
            <div className="card py-3 px-4">
              <p className="text-xs text-slate-500">Secciones con datos</p>
              <p className="text-lg font-semibold text-slate-800">{fmt(summaryQuery.data.secciones)}</p>
            </div>
            {layerMode === 'margin' ? (
              <>
                <div className="card py-3 px-4 border-l-4 border-emerald-500">
                  <p className="text-xs text-slate-500">A favor (verde)</p>
                  <p className="text-lg font-semibold text-emerald-700">{fmt(counts.win)}</p>
                </div>
                <div className="card py-3 px-4 border-l-4 border-red-500">
                  <p className="text-xs text-slate-500">En contra (rojo)</p>
                  <p className="text-lg font-semibold text-red-700">{fmt(counts.lose)}</p>
                </div>
                <div className="card py-3 px-4">
                  <p className="text-xs text-slate-500">Empate</p>
                  <p className="text-lg font-semibold text-slate-700">{fmt(counts.tie)}</p>
                </div>
              </>
            ) : (
              activeParties.slice(0, 3).map((party) => (
                <div
                  key={party}
                  className="card py-3 px-4 border-l-4"
                  style={{ borderLeftColor: PARTY_COLORS[party]?.fill ?? PARTY_COLORS.OTRO.fill }}
                >
                  <p className="text-xs text-slate-500">Lidera {party}</p>
                  <p className="text-lg font-semibold text-slate-800">{fmt(partyCounts[party])} secc.</p>
                </div>
              ))
            )}
            {summaryQuery.data.nosotros != null && layerMode === 'margin' && (
              <div className="card py-3 px-4">
                <p className="text-xs text-slate-500">Total nosotros</p>
                <p className="text-lg font-semibold text-slate-800">{fmt(summaryQuery.data.nosotros)}</p>
              </div>
            )}
            {summaryQuery.data.a_favor != null && layerMode === 'margin' && (
              <div className="card py-3 px-4">
                <p className="text-xs text-slate-500">Margen total a favor</p>
                <p className="text-lg font-semibold text-slate-800">{fmt(summaryQuery.data.a_favor)}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Capa del mapa</span>
          <select
            className="input min-w-[12rem]"
            value={layerMode}
            onChange={(e) => setLayerMode(e.target.value)}
          >
            <option value="margin">Margen a favor (verde / rojo)</option>
            <option value="party">Ganador de la sección (mayor votación)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Ir a sección</span>
          <input
            className="input w-28"
            inputMode="numeric"
            placeholder="Ej. 5183"
            value={seccionFilter}
            onChange={(e) => setSeccionFilter(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        <button type="button" className="btn-secondary" onClick={() => setSeccionFilter('')}>
          Ver todas
        </button>
      </div>

      <div className="legend flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
        <span className="font-medium text-slate-700 w-full sm:w-auto">Leyenda:</span>
        {layerMode === 'margin' ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-5 rounded-sm border border-emerald-700" style={{ background: '#10b981' }} />
              A favor
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-5 rounded-sm border border-red-700" style={{ background: '#ef4444' }} />
              En contra
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-5 rounded-sm border border-slate-400" style={{ background: '#94a3b8' }} />
              Empate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-5 rounded-sm border border-slate-300" style={{ background: '#e2e8f0' }} />
              Sin datos
            </span>
          </>
        ) : (
          activeParties.map((party) => (
            <span key={party} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-5 rounded-sm border"
                style={{
                  background: PARTY_COLORS[party]?.fill ?? PARTY_COLORS.OTRO.fill,
                  borderColor: PARTY_COLORS[party]?.stroke ?? PARTY_COLORS.OTRO.stroke,
                }}
              />
              {party} ({fmt(partyCounts[party])})
            </span>
          ))
        )}
      </div>

      <div
        className="card relative overflow-hidden p-0"
        style={{ height: 'calc(100vh - 340px)', minHeight: 420 }}
      >
        {loading && (
          <div className="absolute left-4 top-4 z-[500] rounded-md bg-white/95 px-3 py-2 text-sm text-slate-600 shadow">
            Cargando mapa…
          </div>
        )}
        {!loading && (mapSectionsQuery.data?.length ?? 0) === 0 && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/80 px-6 text-center text-sm text-slate-600">
            Sin datos de votación. Ejecuta la migración e importa el Excel.
          </div>
        )}
        <MapContainer
          center={[19.4326, -99.1332]}
          zoom={11}
          minZoom={0}
          maxZoom={21}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.google.com/maps">Google</a>'
            url={GOOGLE_RASTER_TILE_URL}
            subdomains="0123"
            maxZoom={20}
          />
          {enrichedGeoJson?.features?.length > 0 && (
            <>
              <FitBounds geoJson={enrichedGeoJson} enabled />
              <GeoJSON
                key={`${year}-${layerMode}-${filterNum || 'all'}-${mapSectionsQuery.dataUpdatedAt}`}
                data={enrichedGeoJson}
                style={styleFeature}
                onEachFeature={(feature, layer) => {
                  const seccionId = resolveSeccionId(feature.properties);
                  layer.bindPopup(buildPopup(seccionId, feature.properties?.voting));
                }}
              />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
