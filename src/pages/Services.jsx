import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { catalogsApi, citizensApi, servicesApi } from '../api/index.js';
import { useAuth } from '../hooks/useAuth.jsx';

const STATUS_COLORS = {
  PENDIENTE: 'bg-accent-100 text-accent-800',
  EN_PROCESO: 'bg-blue-100 text-blue-800',
  ATENDIDO: 'bg-emerald-100 text-emerald-800',
  RECHAZADO: 'bg-brand-100 text-brand-800',
};

const STATUS_OPTIONS = ['PENDIENTE', 'EN_PROCESO', 'ATENDIDO', 'RECHAZADO'];
const PRIORITY_OPTIONS = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];

function ConfirmStatusModal({
  open,
  serviceId,
  serviceTitle,
  from,
  to,
  pending,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-status-title"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 id="confirm-status-title" className="font-semibold text-slate-800">
            Confirmar cambio de estatus
          </h3>
        </div>
        <div className="px-4 py-4 space-y-2 text-sm text-slate-700">
          <p>
            <span className="text-slate-500">Servicio</span>{' '}
            <span className="font-medium text-slate-900">#{serviceId}</span>
            {serviceTitle ? (
              <>
                {' '}
                · <span className="font-medium">{serviceTitle}</span>
              </>
            ) : null}
          </p>
          <p>
            ¿Deseas pasar de{' '}
            <span className={`badge ${STATUS_COLORS[from] || ''}`}>{from}</span> a{' '}
            <span className={`badge ${STATUS_COLORS[to] || ''}`}>{to}</span>?
          </p>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/80 rounded-b-xl">
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            onClick={onCancel}
            disabled={pending}
          >
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={pending}>
            {pending ? 'Aplicando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('services.write');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [statusSelectReset, setStatusSelectReset] = useState(0);

  const [tableFilters, setTableFilters] = useState({
    curp: '',
    status_code: '',
    operational_area_id: '',
    operational_area_offering_id: '',
    priority: '',
  });
  const [debouncedCurp, setDebouncedCurp] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedCurp(tableFilters.curp.trim()), 350);
    return () => clearTimeout(id);
  }, [tableFilters.curp]);

  const listParams = useMemo(() => {
    const p = { page: 1, page_size: 50 };
    if (debouncedCurp) p.curp = debouncedCurp;
    if (tableFilters.status_code) p.status_code = tableFilters.status_code;
    if (tableFilters.operational_area_id)
      p.operational_area_id = Number(tableFilters.operational_area_id);
    if (tableFilters.operational_area_offering_id)
      p.operational_area_offering_id = Number(tableFilters.operational_area_offering_id);
    if (tableFilters.priority) p.priority = tableFilters.priority;
    return p;
  }, [
    debouncedCurp,
    tableFilters.status_code,
    tableFilters.operational_area_id,
    tableFilters.operational_area_offering_id,
    tableFilters.priority,
  ]);

  const [citizenSearch, setCitizenSearch] = useState('');
  const [form, setForm] = useState({
    citizen_id: '',
    operational_area_id: '',
    operational_area_offering_id: '',
    title: '',
    description: '',
    priority: 'MEDIA',
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['catalogs', 'operational-areas'],
    queryFn: () => catalogsApi.areas(),
  });

  const filterAreaIdNum = tableFilters.operational_area_id
    ? Number(tableFilters.operational_area_id)
    : null;
  const { data: filterOfferings = [] } = useQuery({
    queryKey: ['catalogs', 'area-offerings-filter', filterAreaIdNum],
    queryFn: () => catalogsApi.areaOfferings(filterAreaIdNum),
    enabled: Boolean(filterAreaIdNum),
  });

  const areaIdNum = form.operational_area_id ? Number(form.operational_area_id) : null;

  const { data: offerings = [] } = useQuery({
    queryKey: ['catalogs', 'area-offerings', areaIdNum],
    queryFn: () => catalogsApi.areaOfferings(areaIdNum),
    enabled: Boolean(areaIdNum),
  });

  const { data: citizensData } = useQuery({
    queryKey: ['citizens', 'service-form', citizenSearch],
    queryFn: () =>
      citizensApi.list({
        q: citizenSearch || undefined,
        page: 1,
        page_size: 25,
      }),
    enabled: showRegisterForm,
  });

  const { data } = useQuery({
    queryKey: ['services', listParams],
    queryFn: () => servicesApi.list(listParams),
  });

  const create = useMutation({
    mutationFn: () => {
      const payload = {
        citizen_id: Number(form.citizen_id),
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
      };
      if (form.operational_area_id) {
        payload.operational_area_id = Number(form.operational_area_id);
      }
      if (form.operational_area_offering_id) {
        payload.operational_area_offering_id = Number(form.operational_area_offering_id);
      }
      return servicesApi.create(payload);
    },
    onSuccess: () => {
      toast.success('Servicio registrado');
      setForm({
        citizen_id: '',
        operational_area_id: '',
        operational_area_offering_id: '',
        title: '',
        description: '',
        priority: 'MEDIA',
      });
      setCitizenSearch('');
      setShowRegisterForm(false);
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const change = useMutation({
    mutationFn: ({ id, to }) => servicesApi.changeStatus(id, { to_status: to }),
    onSuccess: () => {
      toast.success('Estatus actualizado');
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });

  useEffect(() => {
    if (!statusConfirm) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !change.isPending) {
        setStatusConfirm(null);
        setStatusSelectReset((v) => v + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [statusConfirm, change.isPending]);

  const closeStatusConfirm = () => {
    if (change.isPending) return;
    setStatusConfirm(null);
    setStatusSelectReset((v) => v + 1);
  };

  const confirmStatusChange = () => {
    if (!statusConfirm || change.isPending) return;
    const { id, to } = statusConfirm;
    setStatusConfirm(null);
    setStatusSelectReset((v) => v + 1);
    change.mutate({ id, to });
  };

  const clearTableFilters = () => {
    setTableFilters({
      curp: '',
      status_code: '',
      operational_area_id: '',
      operational_area_offering_id: '',
      priority: '',
    });
    setDebouncedCurp('');
  };

  const hasActiveFilters =
    tableFilters.curp ||
    tableFilters.status_code ||
    tableFilters.operational_area_id ||
    tableFilters.operational_area_offering_id ||
    tableFilters.priority;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Servicios</h2>
          <p className="text-sm text-slate-500">Gestión de atenciones operativas.</p>
        </div>
        <button
          type="button"
          className="btn-primary shrink-0 self-start"
          disabled={!canWrite}
          onClick={() => setShowRegisterForm((v) => !v)}
        >
          {showRegisterForm ? 'Ocultar formulario' : 'Registrar servicio'}
        </button>
      </header>

      <section className="card space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Filtros del listado</h3>
            <p className="text-sm text-slate-500">
              CURP, estatus, área operativa, servicio del catálogo y prioridad.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="text-sm text-brand-700 hover:underline self-start"
              onClick={clearTableFilters}
            >
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <div>
            <label className="label">CURP</label>
            <input
              className="input"
              placeholder="Ej. ABCD123456HDFXXX01"
              value={tableFilters.curp}
              onChange={(e) => setTableFilters((f) => ({ ...f, curp: e.target.value }))}
              autoCapitalize="characters"
            />
          </div>
          <div>
            <label className="label">Estatus</label>
            <select
              className="input"
              value={tableFilters.status_code}
              onChange={(e) => setTableFilters((f) => ({ ...f, status_code: e.target.value }))}
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Área operativa</label>
            <select
              className="input"
              value={tableFilters.operational_area_id}
              onChange={(e) =>
                setTableFilters((f) => ({
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
              value={tableFilters.operational_area_offering_id}
              disabled={!filterAreaIdNum}
              onChange={(e) =>
                setTableFilters((f) => ({ ...f, operational_area_offering_id: e.target.value }))
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
              value={tableFilters.priority}
              onChange={(e) => setTableFilters((f) => ({ ...f, priority: e.target.value }))}
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

      {showRegisterForm && (
        <section className="card space-y-4 border-brand-200 ring-1 ring-brand-100">
          <div>
            <h3 className="font-semibold text-slate-800">Nuevo servicio</h3>
            <p className="text-sm text-slate-500">Asócialo a un ciudadano ya registrado.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="label">Buscar ciudadano</label>
              <input
                className="input"
                placeholder="Nombre, CURP o clave de elector…"
                value={citizenSearch}
                onChange={(e) => setCitizenSearch(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Ciudadano</label>
              <select
                className="input"
                value={form.citizen_id}
                onChange={(e) => setForm((prev) => ({ ...prev, citizen_id: e.target.value }))}
                required
              >
                <option value="">Selecciona un ciudadano…</option>
                {citizensData?.items?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellido_paterno} {c.apellido_materno || ''} · {c.curp}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Área operativa (opcional)</label>
              <select
                className="input"
                value={form.operational_area_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    operational_area_id: e.target.value,
                    operational_area_offering_id: '',
                  }))
                }
              >
                <option value="">Sin área / texto libre</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Servicio del catálogo</label>
              <select
                className="input"
                disabled={!areaIdNum}
                value={form.operational_area_offering_id}
                onChange={(e) => {
                  const id = e.target.value;
                  const item = offerings.find((o) => String(o.id) === id);
                  setForm((prev) => ({
                    ...prev,
                    operational_area_offering_id: id,
                    title: item ? item.name : prev.title,
                  }));
                }}
              >
                <option value="">
                  {areaIdNum ? 'Selecciona o escribe el título abajo…' : 'Elige un área primero'}
                </option>
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Título</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ej. Reparación de luminaria (se rellena al elegir catálogo)"
              />
            </div>
            <div>
              <label className="label">Prioridad</label>
              <select
                className="input"
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Descripción (opcional)</label>
              <textarea
                className="input min-h-24"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Detalle del servicio solicitado…"
              />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => setShowRegisterForm(false)}
            >
              Cancelar
            </button>
            <button
              className="btn-primary"
              disabled={!canWrite || create.isPending || !form.citizen_id || !form.title.trim()}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Guardando…' : 'Crear servicio'}
            </button>
          </div>
        </section>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-600 border-b">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Servicio</th>
              <th className="px-3 py-2">Ciudadano</th>
              <th className="px-3 py-2">Prioridad</th>
              <th className="px-3 py-2">Estatus</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.items?.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2 text-slate-500">#{s.id}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-800">{s.title}</div>
                  {s.operational_area_offering?.name &&
                    s.operational_area_offering.name !== s.title && (
                      <div className="text-xs text-slate-500">
                        Catálogo: {s.operational_area_offering.name}
                      </div>
                    )}
                </td>
                <td className="px-3 py-2">
                  {s.citizen ? (
                    <div>
                      <div className="text-slate-800">
                        {s.citizen.nombre} {s.citizen.apellido_paterno}{' '}
                        {s.citizen.apellido_materno || ''}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">{s.citizen.curp}</div>
                    </div>
                  ) : (
                    <span className="text-slate-500">ID {s.citizen_id}</span>
                  )}
                </td>
                <td className="px-3 py-2">{s.priority}</td>
                <td className="px-3 py-2">
                  <span className={`badge ${STATUS_COLORS[s.status_code] || ''}`}>
                    {s.status_code}
                  </span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <select
                    key={`svc-${s.id}-${statusSelectReset}`}
                    className="input w-40"
                    disabled={!canWrite}
                    defaultValue=""
                    title="Cambiar estatus del servicio"
                    aria-label={`Cambiar estatus del servicio ${s.id}`}
                    onChange={(e) => {
                      const to = e.target.value;
                      if (!to) return;
                      setStatusConfirm({
                        id: s.id,
                        title: s.title,
                        from: s.status_code,
                        to,
                      });
                      setStatusSelectReset((v) => v + 1);
                    }}
                  >
                    <option value="">Cambiar a…</option>
                    {['PENDIENTE', 'EN_PROCESO', 'ATENDIDO', 'RECHAZADO']
                      .filter((x) => x !== s.status_code)
                      .map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.items?.length === 0 && (
          <p className="px-3 py-8 text-center text-slate-500 text-sm">
            No hay servicios con estos filtros.
          </p>
        )}
      </div>

      <ConfirmStatusModal
        open={Boolean(statusConfirm)}
        serviceId={statusConfirm?.id}
        serviceTitle={statusConfirm?.title}
        from={statusConfirm?.from}
        to={statusConfirm?.to}
        pending={change.isPending}
        onCancel={closeStatusConfirm}
        onConfirm={confirmStatusChange}
      />
    </div>
  );
}
