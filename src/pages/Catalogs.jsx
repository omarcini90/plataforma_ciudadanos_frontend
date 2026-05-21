import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  IconBuildingCommunity,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconFlag,
  IconHome,
  IconLayoutList,
  IconMap2,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { catalogsApi } from '../api/index.js';

const TABS = [
  { id: 'STATUS', label: 'Estatus', shortLabel: 'Estatus', Icon: IconLayoutList },
  { id: 'AREAS', label: 'Áreas y servicios', shortLabel: 'Áreas', Icon: IconBuildingCommunity },
  { id: 'COLONIAS', label: 'Colonias', shortLabel: 'Colonias', Icon: IconHome },
  { id: 'SECCIONES', label: 'Secciones', shortLabel: 'Secciones', Icon: IconFlag },
  { id: 'TERRITORIALES', label: 'Territoriales', shortLabel: 'Territoriales', Icon: IconMap2 },
];

function CatalogTabButton({ t, active, onSelect, variant }) {
  if (variant === 'vertical') {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        aria-controls={`catalog-panel-${t.id}`}
        id={`catalog-tab-${t.id}`}
        onClick={() => onSelect(t.id)}
        className={`flex flex-col items-center gap-1 w-full px-1.5 py-2.5 text-[10px] font-medium text-center border-l-2 transition touch-manipulation ${
          active
            ? 'border-brand-700 bg-white text-brand-800 shadow-sm'
            : 'border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-700'
        }`}
      >
        <t.Icon
          size={18}
          stroke={active ? 2 : 1.75}
          className={`shrink-0 ${active ? 'text-brand-700' : 'text-slate-400'}`}
          aria-hidden
        />
        <span className="leading-tight">{t.shortLabel}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`catalog-panel-${t.id}`}
      id={`catalog-tab-${t.id}`}
      onClick={() => onSelect(t.id)}
      className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
        active
          ? 'border-brand-700 text-brand-800'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
      }`}
    >
      <t.Icon
        size={18}
        stroke={active ? 2 : 1.75}
        className={active ? 'text-brand-700' : 'text-slate-400'}
        aria-hidden
      />
      {t.label}
    </button>
  );
}

function CatalogTabsRail({ tab, onTabChange }) {
  return (
    <nav
      className="lg:hidden shrink-0 w-[4.5rem] border-r border-slate-200 bg-slate-50/90 flex flex-col py-1"
      role="tablist"
      aria-label="Secciones de catálogos"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {TABS.map((t) => (
        <CatalogTabButton
          key={t.id}
          t={t}
          active={tab === t.id}
          onSelect={onTabChange}
          variant="vertical"
        />
      ))}
    </nav>
  );
}

function CatalogTabsBar({ tab, onTabChange }) {
  return (
    <nav
      className="hidden lg:block border-b border-slate-200 bg-white"
      role="tablist"
      aria-label="Secciones de catálogos"
    >
      <div className="flex flex-wrap gap-x-1">
        {TABS.map((t) => (
          <CatalogTabButton
            key={t.id}
            t={t}
            active={tab === t.id}
            onSelect={onTabChange}
            variant="horizontal"
          />
        ))}
      </div>
    </nav>
  );
}

const iconBtnBase =
  'inline-flex items-center justify-center rounded-lg p-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none';

/** Botón solo icono con tooltip accesible */
function IconAction({ title, onClick, disabled, className = '', children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`${iconBtnBase} ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50 hover:text-brand-700 ${className}`}
    >
      {children}
    </button>
  );
}

function EditIconButton({ disabled, onClick }) {
  return (
    <IconAction title="Editar registro" disabled={disabled} onClick={onClick}>
      <IconPencil size={18} stroke={1.75} aria-hidden />
    </IconAction>
  );
}

/** Baja / alta lógica en catálogos */
function ToggleActiveIconButton({ active, disabled, onToggle }) {
  const title = active ? 'Desactivar (ocultar del uso)' : 'Activar';
  return (
    <IconAction
      title={title}
      disabled={disabled}
      onClick={() => onToggle(!active)}
      className={
        active
          ? 'hover:text-amber-800 hover:ring-amber-200/80 hover:bg-amber-50/80'
          : 'hover:text-emerald-700 hover:ring-emerald-200/80 hover:bg-emerald-50/80'
      }
    >
      {active ? (
        <IconEyeOff size={18} stroke={1.75} aria-hidden />
      ) : (
        <IconEye size={18} stroke={1.75} aria-hidden />
      )}
    </IconAction>
  );
}

function BtnPrimaryIcon({ children, disabled, onClick, type = 'button', title }) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="btn-primary inline-flex items-center justify-center gap-2"
    >
      {children}
    </button>
  );
}

function BtnGhostIcon({ title, onClick, disabled }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`${iconBtnBase} ring-1 ring-slate-300 text-slate-600 hover:bg-slate-100`}
    >
      <IconX size={18} stroke={1.75} aria-hidden />
    </button>
  );
}

function DeleteIconButton({ title = 'Eliminar', disabled, onClick }) {
  return (
    <IconAction
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="hover:text-red-700 hover:ring-red-200 hover:bg-red-50"
    >
      <IconTrash size={18} stroke={1.75} aria-hidden />
    </IconAction>
  );
}

function CatalogModal({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center gap-3 px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <BtnGhostIcon title="Cerrar" onClick={onClose} />
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function CatalogsPage() {
  const [tab, setTab] = useState('STATUS');

  return (
    <div className="space-y-4 lg:space-y-6">
      <header>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Catálogos</h2>
        <p className="text-sm text-slate-500 mt-0.5 hidden sm:block">
          Alta, edición y baja lógica (desactivar). Los cambios aplican en formularios y servicios.
        </p>
      </header>

      <CatalogTabsBar tab={tab} onTabChange={setTab} />

      <div className="flex items-stretch -mx-4 sm:-mx-6 lg:mx-0 border border-slate-200 lg:border-0 rounded-lg lg:rounded-none overflow-hidden lg:overflow-visible bg-white lg:bg-transparent shadow-sm lg:shadow-none">
        <CatalogTabsRail tab={tab} onTabChange={setTab} />
        <div
          role="tabpanel"
          id={`catalog-panel-${tab}`}
          aria-labelledby={`catalog-tab-${tab}`}
          className="flex-1 min-w-0 p-3 sm:p-4 lg:p-0 lg:pt-0"
        >
          {tab === 'STATUS' && <GenericCatalogCrud type="STATUS" />}
          {tab === 'AREAS' && <OperationalAreasCrud />}
          {tab === 'COLONIAS' && <ColoniasCrud />}
          {tab === 'SECCIONES' && <SeccionesCrud />}
          {tab === 'TERRITORIALES' && <TerritorialesCrud />}
        </div>
      </div>
    </div>
  );
}

/** Catálogo genérico (type + code + name), p. ej. STATUS. */
function GenericCatalogCrud({ type, types, title }) {
  const qc = useQueryClient();
  const normalizedTypes = types?.length ? types : [type];
  const qk = ['catalog', normalizedTypes.join('|'), 'admin'];

  const { data = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const chunks = await Promise.all(
        normalizedTypes.map((t) => catalogsApi.list(t, { includeInactive: true }))
      );
      return chunks
        .flat()
        .sort((a, b) => `${a.code}`.localeCompare(`${b.code}`) || `${a.name}`.localeCompare(`${b.name}`));
    },
  });

  const emptyCreate = { code: '', name: '', description: '' };
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editing, setEditing] = useState(null);
  const [dialog, setDialog] = useState(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: qk });

  const createMut = useMutation({
    mutationFn: () =>
      catalogsApi.create({
        type,
        code: createForm.code.trim(),
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        is_active: true,
      }),
    onSuccess: () => {
      toast.success('Registro creado');
      setCreateForm(emptyCreate);
      setDialog(null);
      invalidate();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => catalogsApi.update(id, payload),
    onSuccess: () => {
      toast.success('Guardado');
      setEditing(null);
      setDialog(null);
      invalidate();
    },
  });

  const catalogTitle = title || `Catálogo: ${type}`;

  return (
    <div className="card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-slate-800">{catalogTitle}</h3>
        <BtnPrimaryIcon
          title="Agregar al catálogo"
          onClick={() => {
            setCreateForm(emptyCreate);
            setDialog('create');
          }}
        >
          <IconPlus size={18} stroke={1.75} aria-hidden />
          Agregar
        </BtnPrimaryIcon>
      </div>

      {dialog === 'create' && (
        <CatalogModal title={`Nuevo — ${catalogTitle}`} onClose={() => setDialog(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <input
                className="input"
                placeholder="Código"
                value={createForm.code}
                onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Nombre"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Descripción (opcional)"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setDialog(null)}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={createMut.isPending || !createForm.code.trim() || !createForm.name.trim()}
                onClick={() => createMut.mutate()}
                title="Guardar"
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}

      {dialog === 'edit' && editing && (
        <CatalogModal
          title={`Editar #${editing.id}`}
          onClose={() => {
            setDialog(null);
            setEditing(null);
          }}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <input
                className="input"
                placeholder="Código"
                value={editing.code}
                onChange={(e) => setEditing((e_) => ({ ...e_, code: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Nombre"
                value={editing.name}
                onChange={(e) => setEditing((e_) => ({ ...e_, name: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Descripción"
                value={editing.description || ''}
                onChange={(e) => setEditing((e_) => ({ ...e_, description: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setDialog(null);
                  setEditing(null);
                }}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={updateMut.isPending || !editing.code.trim() || !editing.name.trim()}
                onClick={() =>
                  updateMut.mutate({
                    id: editing.id,
                    payload: {
                      code: editing.code.trim(),
                      name: editing.name.trim(),
                      description: editing.description?.trim() || null,
                    },
                  })
                }
                title="Guardar cambios"
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-600 border-b">
            <tr>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Activo</th>
              <th className="px-3 py-2 w-[88px] text-center text-slate-500" title="Acciones">
                <span className="sr-only">Acciones</span>
                <IconPencil size={16} stroke={1.5} className="inline opacity-40" aria-hidden />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading &&
              data.map((c) => (
                <tr key={c.id} className={!c.is_active ? 'opacity-60 bg-slate-50/80' : ''}>
                  <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2 text-slate-500">{c.description || '—'}</td>
                  <td className="px-3 py-2">{c.is_active ? 'Sí' : 'No'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <EditIconButton
                        disabled={updateMut.isPending}
                        onClick={() => {
                          setEditing({ ...c });
                          setDialog('edit');
                        }}
                      />
                      <ToggleActiveIconButton
                        active={c.is_active}
                        disabled={updateMut.isPending}
                        onToggle={(next) =>
                          updateMut.mutate({ id: c.id, payload: { is_active: next } })
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OperationalAreasCrud() {
  const qc = useQueryClient();
  const ak = ['catalogs', 'areas'];

  const { data: areas = [], isLoading: loadingAreas } = useQuery({
    queryKey: ak,
    queryFn: () => catalogsApi.areas(),
  });

  const emptyAreaNew = { name: '', code: '', description: '' };
  const [areaNew, setAreaNew] = useState(emptyAreaNew);
  const [editingArea, setEditingArea] = useState(null);
  const [areaDialog, setAreaDialog] = useState(null);

  const [offerAreaId, setOfferAreaId] = useState('');
  const areaIdNum = offerAreaId ? Number(offerAreaId) : null;

  const ok = ['catalogs', 'offerings', areaIdNum, 'admin'];

  const { data: offerings = [], isLoading: loadingOff } = useQuery({
    queryKey: ok,
    queryFn: () => catalogsApi.areaOfferings(areaIdNum, { includeInactive: true }),
    enabled: Boolean(areaIdNum),
  });

  const emptyOffNew = { code: '', name: '', description: '', sort_order: 0 };
  const [offNew, setOffNew] = useState(emptyOffNew);
  const [editingOff, setEditingOff] = useState(null);
  const [offeringDialog, setOfferingDialog] = useState(null);

  const invalidateAreas = () => qc.invalidateQueries({ queryKey: ak });
  const invalidateOff = () => {
    if (areaIdNum) qc.invalidateQueries({ queryKey: ok });
  };

  const createAreaMut = useMutation({
    mutationFn: () =>
      catalogsApi.createArea({
        name: areaNew.name.trim(),
        code: areaNew.code.trim() || null,
        description: areaNew.description.trim() || null,
        is_active: true,
      }),
    onSuccess: () => {
      toast.success('Área creada');
      setAreaNew(emptyAreaNew);
      setAreaDialog(null);
      invalidateAreas();
    },
  });

  const updateAreaMut = useMutation({
    mutationFn: ({ id, payload }) => catalogsApi.updateArea(id, payload),
    onSuccess: () => {
      toast.success('Área actualizada');
      setEditingArea(null);
      setAreaDialog(null);
      invalidateAreas();
    },
  });

  const createOffMut = useMutation({
    mutationFn: () =>
      catalogsApi.createOffering(areaIdNum, {
        code: offNew.code.trim(),
        name: offNew.name.trim(),
        description: offNew.description.trim() || null,
        sort_order: Number(offNew.sort_order) || 0,
      }),
    onSuccess: () => {
      toast.success('Servicio agregado al catálogo');
      setOffNew(emptyOffNew);
      setOfferingDialog(null);
      invalidateOff();
    },
  });

  const updateOffMut = useMutation({
    mutationFn: ({ id, payload }) => catalogsApi.updateOffering(areaIdNum, id, payload),
    onSuccess: () => {
      toast.success('Servicio actualizado');
      setEditingOff(null);
      setOfferingDialog(null);
      invalidateOff();
    },
  });

  return (
    <div className="space-y-8">
      <section className="card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-slate-800">Áreas operativas</h3>
          <BtnPrimaryIcon
            title="Crear área operativa"
            onClick={() => {
              setAreaNew(emptyAreaNew);
              setAreaDialog('create');
            }}
          >
            <IconPlus size={18} stroke={1.75} aria-hidden />
            Agregar área
          </BtnPrimaryIcon>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-600 border-b">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2">Activo</th>
                <th className="px-3 py-2 w-[88px] text-center text-slate-500" title="Acciones">
                  <span className="sr-only">Acciones</span>
                  <IconPencil size={16} stroke={1.5} className="inline opacity-40" aria-hidden />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loadingAreas && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-slate-500">
                    Cargando…
                  </td>
                </tr>
              )}
              {!loadingAreas &&
                areas.map((a) => (
                  <tr key={a.id} className={!a.is_active ? 'opacity-60 bg-slate-50/80' : ''}>
                    <td className="px-3 py-2">{a.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{a.code || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{a.description || '—'}</td>
                    <td className="px-3 py-2">{a.is_active ? 'Sí' : 'No'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <EditIconButton
                          disabled={updateAreaMut.isPending}
                          onClick={() => {
                            setEditingArea({ ...a });
                            setAreaDialog('edit');
                          }}
                        />
                        <ToggleActiveIconButton
                          active={a.is_active}
                          disabled={updateAreaMut.isPending}
                          onToggle={(next) =>
                            updateAreaMut.mutate({ id: a.id, payload: { is_active: next } })
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-4">
        <h3 className="font-semibold text-slate-800">Servicios del catálogo por área</h3>
        <p className="text-sm text-slate-500">
          Elige un área para dar de alta o editar los trámites/servicios (`operational_area_offerings`).
          Desactivar oculta el ítem en nuevos servicios sin borrarlo.
        </p>

        <div className="max-w-md">
          <label className="label">Área</label>
          <select
            className="input"
            value={offerAreaId}
            onChange={(e) => {
              setOfferAreaId(e.target.value);
              setEditingOff(null);
              setOfferingDialog(null);
              setOffNew(emptyOffNew);
            }}
          >
            <option value="">Selecciona un área…</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {!areaIdNum ? (
          <p className="text-sm text-slate-400">Selecciona un área para ver y editar sus servicios.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Área seleccionada:{' '}
                <span className="font-medium text-slate-800">
                  {areas.find((x) => String(x.id) === offerAreaId)?.name || `#${offerAreaId}`}
                </span>
              </p>
              <BtnPrimaryIcon
                title="Agregar servicio al catálogo del área"
                onClick={() => {
                  setOffNew(emptyOffNew);
                  setOfferingDialog('create');
                }}
              >
                <IconPlus size={18} stroke={1.75} aria-hidden />
                Agregar servicio
              </BtnPrimaryIcon>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-600 border-b">
                  <tr>
                    <th className="px-3 py-2">Orden</th>
                    <th className="px-3 py-2">Código</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Descripción</th>
                    <th className="px-3 py-2">Activo</th>
                    <th className="px-3 py-2 w-[88px] text-center text-slate-500" title="Acciones">
                      <span className="sr-only">Acciones</span>
                      <IconPencil size={16} stroke={1.5} className="inline opacity-40" aria-hidden />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loadingOff && (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-slate-500">
                        Cargando…
                      </td>
                    </tr>
                  )}
                  {!loadingOff &&
                    offerings.map((o) => (
                      <tr key={o.id} className={!o.is_active ? 'opacity-60 bg-slate-50/80' : ''}>
                        <td className="px-3 py-2">{o.sort_order}</td>
                        <td className="px-3 py-2 font-mono text-xs">{o.code}</td>
                        <td className="px-3 py-2">{o.name}</td>
                        <td className="px-3 py-2 text-slate-500">{o.description || '—'}</td>
                        <td className="px-3 py-2">{o.is_active ? 'Sí' : 'No'}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <EditIconButton
                              disabled={updateOffMut.isPending}
                              onClick={() => {
                                setEditingOff({ ...o });
                                setOfferingDialog('edit');
                              }}
                            />
                            <ToggleActiveIconButton
                              active={o.is_active}
                              disabled={updateOffMut.isPending}
                              onToggle={(next) =>
                                updateOffMut.mutate({ id: o.id, payload: { is_active: next } })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {areaDialog === 'create' && (
        <CatalogModal title="Nueva área operativa" onClose={() => setAreaDialog(null)}>
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Nombre *"
              value={areaNew.name}
              onChange={(e) => setAreaNew((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Código (opcional)"
              value={areaNew.code}
              onChange={(e) => setAreaNew((f) => ({ ...f, code: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Descripción"
              value={areaNew.description}
              onChange={(e) => setAreaNew((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setAreaDialog(null)}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={createAreaMut.isPending || !areaNew.name.trim()}
                onClick={() => createAreaMut.mutate()}
                title="Guardar"
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}

      {areaDialog === 'edit' && editingArea && (
        <CatalogModal
          title={`Editar área #${editingArea.id}`}
          onClose={() => {
            setAreaDialog(null);
            setEditingArea(null);
          }}
        >
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Nombre"
              value={editingArea.name}
              onChange={(e) => setEditingArea((a) => ({ ...a, name: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Código"
              value={editingArea.code || ''}
              onChange={(e) => setEditingArea((a) => ({ ...a, code: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Descripción"
              value={editingArea.description || ''}
              onChange={(e) => setEditingArea((a) => ({ ...a, description: e.target.value }))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setAreaDialog(null);
                  setEditingArea(null);
                }}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={updateAreaMut.isPending || !editingArea.name.trim()}
                onClick={() =>
                  updateAreaMut.mutate({
                    id: editingArea.id,
                    payload: {
                      name: editingArea.name.trim(),
                      code: editingArea.code?.trim() || null,
                      description: editingArea.description?.trim() || null,
                    },
                  })
                }
                title="Guardar"
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}

      {offeringDialog === 'create' && areaIdNum && (
        <CatalogModal
          title="Nuevo servicio en el área"
          onClose={() => setOfferingDialog(null)}
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Área:{' '}
              <span className="font-medium text-slate-700">
                {areas.find((x) => x.id === areaIdNum)?.name || `#${areaIdNum}`}
              </span>
            </p>
            <input
              className="input"
              placeholder="Código *"
              value={offNew.code}
              onChange={(e) => setOffNew((f) => ({ ...f, code: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Nombre *"
              value={offNew.name}
              onChange={(e) => setOffNew((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Orden"
              type="number"
              value={offNew.sort_order}
              onChange={(e) => setOffNew((f) => ({ ...f, sort_order: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Descripción"
              value={offNew.description}
              onChange={(e) => setOffNew((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setOfferingDialog(null)}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={createOffMut.isPending || !offNew.code.trim() || !offNew.name.trim()}
                onClick={() => createOffMut.mutate()}
                title="Guardar"
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}

      {offeringDialog === 'edit' && editingOff && areaIdNum && (
        <CatalogModal
          title={`Editar servicio #${editingOff.id}`}
          onClose={() => {
            setOfferingDialog(null);
            setEditingOff(null);
          }}
        >
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Código"
              value={editingOff.code}
              onChange={(e) => setEditingOff((o) => ({ ...o, code: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Nombre"
              value={editingOff.name}
              onChange={(e) => setEditingOff((o) => ({ ...o, name: e.target.value }))}
            />
            <input
              className="input"
              type="number"
              placeholder="Orden"
              value={editingOff.sort_order}
              onChange={(e) =>
                setEditingOff((o) => ({ ...o, sort_order: Number(e.target.value) }))
              }
            />
            <input
              className="input"
              placeholder="Descripción"
              value={editingOff.description || ''}
              onChange={(e) => setEditingOff((o) => ({ ...o, description: e.target.value }))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setOfferingDialog(null);
                  setEditingOff(null);
                }}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={
                  updateOffMut.isPending || !editingOff.code.trim() || !editingOff.name.trim()
                }
                onClick={() =>
                  updateOffMut.mutate({
                    id: editingOff.id,
                    payload: {
                      code: editingOff.code.trim(),
                      name: editingOff.name.trim(),
                      description: editingOff.description?.trim() || null,
                      sort_order: Number(editingOff.sort_order) || 0,
                    },
                  })
                }
                title="Guardar"
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}
    </div>
  );
}

function ColoniasCrud() {
  const qc = useQueryClient();
  const qk = ['catalogs', 'colonias'];

  const { data = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: () => catalogsApi.colonias(),
  });

  const emptyColonia = { name: '', municipio: '', estado: '', codigo_postal: '' };
  const [createForm, setCreateForm] = useState(emptyColonia);
  const [editing, setEditing] = useState(null);
  const [coloniasDialog, setColoniasDialog] = useState(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: qk });

  const createMut = useMutation({
    mutationFn: () =>
      catalogsApi.createColonia({
        name: createForm.name.trim(),
        municipio: createForm.municipio.trim() || null,
        estado: createForm.estado.trim() || null,
        codigo_postal: createForm.codigo_postal.trim() || null,
        is_active: true,
      }),
    onSuccess: () => {
      toast.success('Colonia creada');
      setCreateForm(emptyColonia);
      setColoniasDialog(null);
      invalidate();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => catalogsApi.updateColonia(id, payload),
    onSuccess: () => {
      toast.success('Colonia actualizada');
      setEditing(null);
      setColoniasDialog(null);
      invalidate();
    },
  });

  return (
    <div className="card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-slate-800">Colonias</h3>
        <BtnPrimaryIcon
          title="Crear colonia"
          onClick={() => {
            setCreateForm(emptyColonia);
            setColoniasDialog('create');
          }}
        >
          <IconPlus size={18} stroke={1.75} aria-hidden />
          Agregar colonia
        </BtnPrimaryIcon>
      </div>

      {coloniasDialog === 'create' && (
        <CatalogModal title="Nueva colonia" onClose={() => setColoniasDialog(null)}>
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Nombre *"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Municipio"
              value={createForm.municipio}
              onChange={(e) => setCreateForm((f) => ({ ...f, municipio: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Estado"
              value={createForm.estado}
              onChange={(e) => setCreateForm((f) => ({ ...f, estado: e.target.value }))}
            />
            <input
              className="input"
              placeholder="C.P."
              value={createForm.codigo_postal}
              onChange={(e) => setCreateForm((f) => ({ ...f, codigo_postal: e.target.value }))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setColoniasDialog(null)}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={createMut.isPending || !createForm.name.trim()}
                onClick={() => createMut.mutate()}
                title="Guardar"
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}

      {coloniasDialog === 'edit' && editing && (
        <CatalogModal
          title={`Editar colonia #${editing.id}`}
          onClose={() => {
            setColoniasDialog(null);
            setEditing(null);
          }}
        >
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Nombre"
              value={editing.name}
              onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Municipio"
              value={editing.municipio || ''}
              onChange={(e) => setEditing((x) => ({ ...x, municipio: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Estado"
              value={editing.estado || ''}
              onChange={(e) => setEditing((x) => ({ ...x, estado: e.target.value }))}
            />
            <input
              className="input"
              placeholder="C.P."
              value={editing.codigo_postal || ''}
              onChange={(e) => setEditing((x) => ({ ...x, codigo_postal: e.target.value }))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setColoniasDialog(null);
                  setEditing(null);
                }}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={updateMut.isPending || !editing.name.trim()}
                onClick={() =>
                  updateMut.mutate({
                    id: editing.id,
                    payload: {
                      name: editing.name.trim(),
                      municipio: editing.municipio?.trim() || null,
                      estado: editing.estado?.trim() || null,
                      codigo_postal: editing.codigo_postal?.trim() || null,
                    },
                  })
                }
                title="Guardar"
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-600 border-b">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Municipio</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">C.P.</th>
              <th className="px-3 py-2">Activo</th>
              <th className="px-3 py-2 w-[88px] text-center text-slate-500" title="Acciones">
                <span className="sr-only">Acciones</span>
                <IconPencil size={16} stroke={1.5} className="inline opacity-40" aria-hidden />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading &&
              data.map((c) => (
                <tr key={c.id} className={!c.is_active ? 'opacity-60 bg-slate-50/80' : ''}>
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2">{c.municipio || '—'}</td>
                  <td className="px-3 py-2">{c.estado || '—'}</td>
                  <td className="px-3 py-2">{c.codigo_postal || '—'}</td>
                  <td className="px-3 py-2">{c.is_active ? 'Sí' : 'No'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <EditIconButton
                        disabled={updateMut.isPending}
                        onClick={() => {
                          setEditing({ ...c });
                          setColoniasDialog('edit');
                        }}
                      />
                      <ToggleActiveIconButton
                        active={c.is_active}
                        disabled={updateMut.isPending}
                        onToggle={(next) =>
                          updateMut.mutate({ id: c.id, payload: { is_active: next } })
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Datos desde tabla `secciones` (id = clave de sección). */
function SeccionesCrud() {
  const qc = useQueryClient();
  const qk = ['catalogs', 'secciones-table'];

  const { data = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: () => catalogsApi.secciones(),
  });

  const [newId, setNewId] = useState('');
  const [seccionModalOpen, setSeccionModalOpen] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: qk });

  const createMut = useMutation({
    mutationFn: () => catalogsApi.createSeccion({ id: Number(newId) }),
    onSuccess: () => {
      toast.success('Sección registrada');
      setNewId('');
      setSeccionModalOpen(false);
      invalidate();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => catalogsApi.deleteSeccion(id),
    onSuccess: () => {
      toast.success('Sección eliminada');
      invalidate();
    },
  });

  return (
    <div className="card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Secciones</h3>
          <p className="text-sm text-slate-500 mt-1">
            Listado desde la tabla <code className="text-xs bg-slate-100 px-1 rounded">secciones</code>.
            Cada fila es solo el número de sección (coincide con ciudadanos / INE).
          </p>
        </div>
        <BtnPrimaryIcon
          title="Registrar sección"
          onClick={() => {
            setNewId('');
            setSeccionModalOpen(true);
          }}
        >
          <IconPlus size={18} stroke={1.75} aria-hidden />
          Agregar sección
        </BtnPrimaryIcon>
      </div>

      {seccionModalOpen && (
        <CatalogModal title="Nueva sección" onClose={() => setSeccionModalOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className="label">Id / número de sección</label>
              <input
                className="input"
                type="number"
                min={1}
                placeholder="Ej. 1234"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setSeccionModalOpen(false)}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={
                  createMut.isPending ||
                  !newId.trim() ||
                  !Number.isFinite(Number(newId)) ||
                  Number(newId) < 1
                }
                onClick={() => createMut.mutate()}
                title="Guardar"
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-600 border-b">
            <tr>
              <th className="px-3 py-2">Id sección</th>
              <th className="px-3 py-2 w-[88px] text-center text-slate-500" title="Acciones">
                <span className="sr-only">Acciones</span>
                <IconTrash size={16} stroke={1.5} className="inline opacity-40" aria-hidden />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={2} className="px-3 py-4 text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading &&
              data.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-mono">{row.id}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end">
                      <DeleteIconButton
                        title="Eliminar sección"
                        disabled={deleteMut.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar la sección ${row.id}? Solo hazlo si no hay ciudadanos que la usen.`,
                            )
                          ) {
                            deleteMut.mutate(row.id);
                          }
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Datos desde tabla `territoriales`. */
function TerritorialesCrud() {
  const qc = useQueryClient();
  const qk = ['catalogs', 'territoriales-table'];

  const { data = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: () => catalogsApi.territoriales(),
  });

  const emptyTerritorial = { name: '' };
  const [createForm, setCreateForm] = useState(emptyTerritorial);
  const [editing, setEditing] = useState(null);
  const [terrDialog, setTerrDialog] = useState(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: qk });

  const createMut = useMutation({
    mutationFn: () =>
      catalogsApi.createTerritorial({
        name: createForm.name.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Territorial creado');
      setCreateForm(emptyTerritorial);
      setTerrDialog(null);
      invalidate();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => catalogsApi.updateTerritorial(id, payload),
    onSuccess: () => {
      toast.success('Territorial actualizado');
      setEditing(null);
      setTerrDialog(null);
      invalidate();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => catalogsApi.deleteTerritorial(id),
    onSuccess: () => {
      toast.success('Territorial eliminado');
      invalidate();
    },
  });

  return (
    <div className="card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Territoriales</h3>
          <p className="text-sm text-slate-500 mt-1">
            Listado desde la tabla{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">territoriales</code>.
          </p>
        </div>
        <BtnPrimaryIcon
          title="Crear territorial"
          onClick={() => {
            setCreateForm(emptyTerritorial);
            setTerrDialog('create');
          }}
        >
          <IconPlus size={18} stroke={1.75} aria-hidden />
          Agregar territorial
        </BtnPrimaryIcon>
      </div>

      {terrDialog === 'create' && (
        <CatalogModal title="Nuevo territorial" onClose={() => setTerrDialog(null)}>
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Nombre"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setTerrDialog(null)}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={createMut.isPending}
                onClick={() => createMut.mutate()}
                title="Guardar"
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}

      {terrDialog === 'edit' && editing && (
        <CatalogModal
          title={`Editar territorial #${editing.id}`}
          onClose={() => {
            setTerrDialog(null);
            setEditing(null);
          }}
        >
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Nombre"
              value={editing.name || ''}
              onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setTerrDialog(null);
                  setEditing(null);
                }}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={updateMut.isPending}
                onClick={() =>
                  updateMut.mutate({
                    id: editing.id,
                    payload: { name: editing.name?.trim() || null },
                  })
                }
                title="Guardar"
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-600 border-b">
            <tr>
              <th className="px-3 py-2 w-24">Id</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2 w-[120px] text-center text-slate-500" title="Acciones">
                <span className="sr-only">Acciones</span>
                <IconPencil size={16} stroke={1.5} className="inline opacity-40" aria-hidden />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading &&
              data.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2 font-mono text-xs">{t.id}</td>
                  <td className="px-3 py-2">{t.name || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <EditIconButton
                        disabled={updateMut.isPending || deleteMut.isPending}
                        onClick={() => {
                          setEditing({ ...t });
                          setTerrDialog('edit');
                        }}
                      />
                      <DeleteIconButton
                        title="Eliminar territorial"
                        disabled={deleteMut.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar el territorial #${t.id}? Esta acción no se puede deshacer.`,
                            )
                          ) {
                            deleteMut.mutate(t.id);
                          }
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
