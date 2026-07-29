import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { citizensApi, servicesApi, supportsApi } from '../api/index.js';

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

/**
 * Ficha detallada del ciudadano (misma vista que el mapa al seleccionar un marcador).
 */
export default function CitizenFichaPanel({ citizenId, programs = [], supportTypes = [] }) {
  const citizenDetailQuery = useQuery({
    queryKey: ['citizen', citizenId],
    queryFn: () => citizensApi.get(citizenId),
    enabled: Boolean(citizenId),
  });

  const citizenServicesQuery = useQuery({
    queryKey: ['services', 'citizen-ficha', citizenId],
    queryFn: () => fetchAllServicesForCitizen(citizenId),
    enabled: Boolean(citizenId),
  });

  const citizenSupportsQuery = useQuery({
    queryKey: ['supports', citizenId],
    queryFn: () => supportsApi.byCitizen(citizenId),
    enabled: Boolean(citizenId),
  });

  const programById = useMemo(() => {
    const m = new Map();
    programs.forEach((p) => m.set(p.id, p));
    return m;
  }, [programs]);

  const typeById = useMemo(() => {
    const m = new Map();
    supportTypes.forEach((t) => m.set(t.id, t));
    return m;
  }, [supportTypes]);

  if (!citizenId) return null;

  return (
    <section className="flex flex-col gap-6">
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
              {citizenServicesQuery.data.total} registro
              {citizenServicesQuery.data.total === 1 ? '' : 's'}
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
                        <span className={`badge ${SERVICE_STATUS_BADGE[s.status_code] || ''}`}>
                          {s.status_code}
                        </span>
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
    </section>
  );
}
