import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { IconDownload, IconFileSpreadsheet } from '@tabler/icons-react';
import CitizenFichaPanel from '../components/CitizenFichaPanel.jsx';
import SlidePanel from '../components/SlidePanel.jsx';
import { catalogsApi, reportsApi, supportsApi } from '../api/index.js';

const emptyFilters = {
  q: '',
  seccion_electoral: '',
  distrito: '',
  territorial_id: '',
  colonia: '',
  direccion: '',
  codigo_postal: '',
  program_id: '',
  support_type_id: '',
  operational_area_id: '',
  operational_area_offering_id: '',
  is_active: 'true',
};

function FilterAccordion({ title, hint, defaultOpen = true, children }) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-slate-200 bg-white shadow-sm open:shadow-none"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <span className="font-medium text-slate-800">{title}</span>
          {hint ? <p className="text-xs text-slate-500 mt-0.5">{hint}</p> : null}
        </div>
        <svg
          className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
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
      </summary>
      <div className="border-t border-slate-100 px-4 py-3">{children}</div>
    </details>
  );
}

export default function ReportsPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [selectedCitizenId, setSelectedCitizenId] = useState(null);
  const pageSize = 20;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(filters.q.trim()), 350);
    return () => clearTimeout(id);
  }, [filters.q]);

  const filterAreaIdNum = filters.operational_area_id ? Number(filters.operational_area_id) : null;
  const filterProgramIdNum = filters.program_id ? Number(filters.program_id) : null;
  const filterSupportTypeIdNum = filters.support_type_id ? Number(filters.support_type_id) : null;
  const filterOfferingIdNum = filters.operational_area_offering_id
    ? Number(filters.operational_area_offering_id)
    : null;

  const queryParams = useMemo(() => {
    const p = { page, page_size: pageSize };
    if (debouncedQ) p.q = debouncedQ;
    if (filters.seccion_electoral.trim()) p.seccion_electoral = filters.seccion_electoral.trim();
    if (filters.distrito) p.distrito = Number(filters.distrito);
    if (filters.territorial_id) p.territorial_id = Number(filters.territorial_id);
    if (filters.colonia.trim()) p.colonia = filters.colonia.trim();
    if (filters.direccion.trim()) p.direccion = filters.direccion.trim();
    if (filters.codigo_postal.trim()) p.codigo_postal = filters.codigo_postal.trim();
    if (filterProgramIdNum) p.program_id = filterProgramIdNum;
    if (filterSupportTypeIdNum) p.support_type_id = filterSupportTypeIdNum;
    if (filterAreaIdNum) p.operational_area_id = filterAreaIdNum;
    if (filterOfferingIdNum) p.operational_area_offering_id = filterOfferingIdNum;
    if (filters.is_active === 'true') p.is_active = true;
    else if (filters.is_active === 'false') p.is_active = false;
    else p.is_active = undefined;
    return p;
  }, [
    page,
    debouncedQ,
    filters.seccion_electoral,
    filters.distrito,
    filters.territorial_id,
    filters.colonia,
    filters.direccion,
    filters.codigo_postal,
    filters.is_active,
    filterProgramIdNum,
    filterSupportTypeIdNum,
    filterAreaIdNum,
    filterOfferingIdNum,
  ]);

  const exportParams = useMemo(() => {
    const { page: _p, page_size: _ps, ...rest } = queryParams;
    return rest;
  }, [queryParams]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['reports', 'citizens', queryParams],
    queryFn: () => reportsApi.citizens(queryParams),
    placeholderData: keepPreviousData,
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

  const { data: areas = [] } = useQuery({
    queryKey: ['catalogs', 'operational-areas'],
    queryFn: () => catalogsApi.areas(),
    staleTime: 120_000,
  });

  const { data: filterOfferings = [] } = useQuery({
    queryKey: ['catalogs', 'area-offerings-reports', filterAreaIdNum],
    queryFn: () => catalogsApi.areaOfferings(filterAreaIdNum),
    enabled: Boolean(filterAreaIdNum),
  });

  const { data: secciones = [] } = useQuery({
    queryKey: ['catalogs', 'secciones'],
    queryFn: () => catalogsApi.secciones(),
    staleTime: 120_000,
  });

  const { data: colonias = [] } = useQuery({
    queryKey: ['catalogs', 'colonias'],
    queryFn: () => catalogsApi.colonias(),
    staleTime: 120_000,
  });

  const { data: territoriales = [] } = useQuery({
    queryKey: ['catalogs', 'territoriales'],
    queryFn: () => catalogsApi.territoriales(),
    staleTime: 120_000,
  });

  const seccionesSorted = useMemo(
    () => [...secciones].sort((a, b) => a.id - b.id),
    [secciones],
  );

  const distritosSorted = useMemo(() => {
    const ids = [...new Set(secciones.map((s) => s.distrito).filter((d) => d != null))];
    return ids.sort((a, b) => a - b);
  }, [secciones]);

  const filterDistritoNum = filters.distrito ? Number(filters.distrito) : null;
  const filterTerritorialIdNum = filters.territorial_id ? Number(filters.territorial_id) : null;

  const territorialesSorted = useMemo(() => {
    const list = [...territoriales].sort((a, b) =>
      String(a.name || a.id).localeCompare(String(b.name || b.id), 'es'),
    );
    if (!filterDistritoNum) return list;
    const allowed = new Set();
    for (const s of secciones) {
      if (s.distrito === filterDistritoNum) {
        for (const id of s.territorial_ids || []) allowed.add(Number(id));
      }
    }
    return list.filter((t) => allowed.has(Number(t.id)));
  }, [territoriales, secciones, filterDistritoNum]);

  const coloniasSorted = useMemo(
    () =>
      [...colonias]
        .filter((c) => c.is_active !== false)
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es')),
    [colonias],
  );

  const programTypesFiltered = useMemo(() => {
    if (!filterProgramIdNum) return supportTypes;
    return supportTypes.filter((t) => t.program_id === filterProgramIdNum);
  }, [supportTypes, filterProgramIdNum]);

  const hasActiveFilters =
    Boolean(debouncedQ || filters.q.trim()) ||
    Boolean(filters.distrito) ||
    Boolean(filters.territorial_id) ||
    Boolean(filters.seccion_electoral.trim()) ||
    Boolean(filters.colonia.trim()) ||
    Boolean(filters.direccion.trim()) ||
    Boolean(filters.codigo_postal.trim()) ||
    Boolean(filterProgramIdNum) ||
    Boolean(filterSupportTypeIdNum) ||
    Boolean(filterAreaIdNum) ||
    Boolean(filterOfferingIdNum) ||
    filters.is_active !== 'true';

  const clearFilters = () => {
    setFilters(emptyFilters);
    setDebouncedQ('');
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await reportsApi.exportCitizens(exportParams);
      toast.success('Excel descargado');
    } catch {
      toast.error('No se pudo exportar el reporte');
    } finally {
      setExporting(false);
    }
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reportes</h2>
          <p className="text-sm text-slate-500">
            Consulta ciudadanos con filtros y exporta el resultado a Excel.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          onClick={handleExport}
          disabled={exporting || isLoading}
        >
          {exporting ? (
            <IconDownload size={18} stroke={1.75} aria-hidden />
          ) : (
            <IconFileSpreadsheet size={18} stroke={1.75} aria-hidden />
          )}
          {exporting ? 'Exportando…' : 'Exportar Excel'}
        </button>
      </header>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-800">Filtros</h3>
            <p className="text-sm text-slate-500">
              Distrito, territorial, sección, programa, apoyo, servicio, colonia, dirección, CP, nombre o CURP.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="text-sm text-brand-700 hover:underline self-start"
              onClick={clearFilters}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <FilterAccordion title="Búsqueda y ubicación" hint="Nombre/CURP, distrito, territorial, sección, colonia, dirección y CP">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Nombre o CURP</label>
              <input
                className="input"
                placeholder="Buscar por nombre, CURP o clave de elector"
                value={filters.q}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, q: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="label">Distrito</label>
              <select
                className="input"
                value={filters.distrito}
                onChange={(e) => {
                  setFilters((f) => ({
                    ...f,
                    distrito: e.target.value,
                    territorial_id: '',
                    seccion_electoral: '',
                  }));
                  setPage(1);
                }}
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
              <label className="label">Territorial</label>
              <select
                className="input"
                value={filters.territorial_id}
                onChange={(e) => {
                  setFilters((f) => ({
                    ...f,
                    territorial_id: e.target.value,
                    seccion_electoral: '',
                  }));
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {territorialesSorted.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || `Territorial ${t.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sección electoral</label>
              <input
                className="input"
                list="reports-secciones"
                inputMode="numeric"
                placeholder="5463"
                value={filters.seccion_electoral}
                onChange={(e) => {
                  setFilters((f) => ({
                    ...f,
                    seccion_electoral: e.target.value.replace(/\D/g, ''),
                  }));
                  setPage(1);
                }}
              />
              <datalist id="reports-secciones">
                {seccionesSorted
                  .filter((s) => {
                    if (filterDistritoNum && s.distrito !== filterDistritoNum) return false;
                    if (
                      filterTerritorialIdNum &&
                      !(s.territorial_ids || []).map(Number).includes(filterTerritorialIdNum)
                    ) {
                      return false;
                    }
                    return true;
                  })
                  .map((s) => (
                    <option key={s.id} value={String(s.id)} />
                  ))}
              </datalist>
            </div>
            <div>
              <label className="label">Código postal</label>
              <input
                className="input"
                placeholder="CP"
                value={filters.codigo_postal}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, codigo_postal: e.target.value.replace(/\D/g, '') }));
                  setPage(1);
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Colonia</label>
              <input
                className="input"
                list="reports-colonias"
                placeholder="Coincidencia parcial"
                value={filters.colonia}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, colonia: e.target.value }));
                  setPage(1);
                }}
              />
              <datalist id="reports-colonias">
                {coloniasSorted.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Dirección (calle / número)</label>
              <input
                className="input"
                placeholder="Ej. Sur 16 o 245"
                value={filters.direccion}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, direccion: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="label">Estatus</label>
              <select
                className="input"
                value={filters.is_active}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, is_active: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
                <option value="">Todos</option>
              </select>
            </div>
          </div>
        </FilterAccordion>

        <FilterAccordion
          title="Programas, apoyos y servicios"
          hint="Filtra por programa social, tipo de apoyo o servicio operativo"
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="label">Programa</label>
              <select
                className="input"
                value={filters.program_id}
                onChange={(e) => {
                  setFilters((f) => ({
                    ...f,
                    program_id: e.target.value,
                    support_type_id: '',
                  }));
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                {supportPrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Apoyo (tipo)</label>
              <select
                className="input"
                value={filters.support_type_id}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, support_type_id: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                {programTypesFiltered.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Área operativa</label>
              <select
                className="input"
                value={filters.operational_area_id}
                onChange={(e) => {
                  setFilters((f) => ({
                    ...f,
                    operational_area_id: e.target.value,
                    operational_area_offering_id: '',
                  }));
                  setPage(1);
                }}
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
                value={filters.operational_area_offering_id}
                disabled={!filterAreaIdNum}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, operational_area_offering_id: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">Todos en el área</option>
                {filterOfferings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FilterAccordion>
      </section>

      <div className="card overflow-x-auto">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-800">Resultados</h3>
          <span className="text-sm text-slate-500">
            {isFetching && !isLoading ? 'Actualizando… · ' : ''}
            {total.toLocaleString('es-MX')} ciudadano{total === 1 ? '' : 's'}
          </span>
        </div>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">CURP</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Sección</th>
              <th className="px-3 py-2">Distrito</th>
              <th className="px-3 py-2">Colonia</th>
              <th className="px-3 py-2">CP</th>
              <th className="px-3 py-2">Programas</th>
              <th className="px-3 py-2">Apoyos</th>
              <th className="px-3 py-2 text-right">Servicios</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            ) : !data?.items?.length ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-500">
                  Sin resultados para los filtros actuales.
                </td>
              </tr>
            ) : (
              data.items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{c.curp}</td>
                  <td className="px-3 py-2">
                    {c.nombre} {c.apellido_paterno} {c.apellido_materno || ''}
                  </td>
                  <td className="px-3 py-2">{c.seccion_electoral || '—'}</td>
                  <td className="px-3 py-2">{c.distrito ?? '—'}</td>
                  <td className="px-3 py-2">{c.colonia || '—'}</td>
                  <td className="px-3 py-2">{c.codigo_postal || '—'}</td>
                  <td className="px-3 py-2 max-w-[10rem] truncate" title={c.programs_summary || ''}>
                    {c.programs_summary || '—'}
                  </td>
                  <td className="px-3 py-2 max-w-[10rem] truncate" title={c.supports_summary || ''}>
                    {c.supports_summary || '—'}
                  </td>
                  <td className="px-3 py-2 text-right">{c.services_count ?? 0}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-brand-700 hover:underline"
                      onClick={() => setSelectedCitizenId(c.id)}
                    >
                      Ver ficha
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-500">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

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
