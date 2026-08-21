import { useEffect, useMemo, useState } from 'react';
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
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { catalogsApi } from '../api/index.js';
import PhotoCropModal from '../components/PhotoCropModal.jsx';

const TABS = [
  { id: 'STATUS', label: 'Estatus', shortLabel: 'Estatus', Icon: IconLayoutList },
  { id: 'AREAS', label: 'Áreas y servicios', shortLabel: 'Áreas', Icon: IconBuildingCommunity },
  { id: 'COLONIAS', label: 'Colonias', shortLabel: 'Colonias', Icon: IconHome },
  { id: 'SECCIONES', label: 'Secciones', shortLabel: 'Secciones', Icon: IconFlag },
  { id: 'TERRITORIALES', label: 'Territoriales', shortLabel: 'Territoriales', Icon: IconMap2 },
  { id: 'DIRECTORIO', label: 'Directorio', shortLabel: 'Directorio', Icon: IconUsers },
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

function CatalogModal({ title, children, onClose, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
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
          {tab === 'DIRECTORIO' && <DirectoryCrud />}
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

  const { data: territoriales = [] } = useQuery({
    queryKey: ['catalogs', 'territoriales-table'],
    queryFn: () => catalogsApi.territoriales(),
  });

  const [newId, setNewId] = useState('');
  const [seccionModalOpen, setSeccionModalOpen] = useState(false);
  const [filterDistrito, setFilterDistrito] = useState('');
  const [filterTerritorial, setFilterTerritorial] = useState('');

  const territorialNameById = useMemo(() => {
    const map = new Map();
    for (const t of territoriales) map.set(Number(t.id), t.name || `Territorial ${t.id}`);
    return map;
  }, [territoriales]);

  const distritos = useMemo(() => {
    const ids = [...new Set(data.map((s) => s.distrito).filter((d) => d != null))];
    return ids.sort((a, b) => a - b);
  }, [data]);

  const filteredSecciones = useMemo(() => {
    const distritoNum = filterDistrito ? Number(filterDistrito) : null;
    const territorialNum = filterTerritorial ? Number(filterTerritorial) : null;
    return data.filter((s) => {
      if (distritoNum && s.distrito !== distritoNum) return false;
      if (territorialNum && !(s.territorial_ids || []).map(Number).includes(territorialNum)) {
        return false;
      }
      return true;
    });
  }, [data, filterDistrito, filterTerritorial]);

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
            Listado desde la tabla <code className="text-xs bg-slate-100 px-1 rounded">secciones</code>
            {' '}con distrito y territoriales (origen VC_PROD).
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="label">Distrito</label>
          <select
            className="input"
            value={filterDistrito}
            onChange={(e) => setFilterDistrito(e.target.value)}
          >
            <option value="">Todos</option>
            {distritos.map((d) => (
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
            value={filterTerritorial}
            onChange={(e) => setFilterTerritorial(e.target.value)}
          >
            <option value="">Todas</option>
            {territoriales.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || `Territorial ${t.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-600 border-b">
            <tr>
              <th className="px-3 py-2">Id sección</th>
              <th className="px-3 py-2">Distrito</th>
              <th className="px-3 py-2">Territoriales</th>
              <th className="px-3 py-2 w-[88px] text-center text-slate-500" title="Acciones">
                <span className="sr-only">Acciones</span>
                <IconTrash size={16} stroke={1.5} className="inline opacity-40" aria-hidden />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading &&
              filteredSecciones.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-mono">{row.id}</td>
                  <td className="px-3 py-2">{row.distrito ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {(row.territorial_ids || [])
                      .map((id) => territorialNameById.get(Number(id)) || id)
                      .join(', ') || '—'}
                  </td>
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
              <th className="px-3 py-2 w-28">Secciones</th>
              <th className="px-3 py-2 w-[120px] text-center text-slate-500" title="Acciones">
                <span className="sr-only">Acciones</span>
                <IconPencil size={16} stroke={1.5} className="inline opacity-40" aria-hidden />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading &&
              data.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2 font-mono text-xs">{t.id}</td>
                  <td className="px-3 py-2">{t.name || '—'}</td>
                  <td className="px-3 py-2">{(t.seccion_ids || []).length}</td>
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

function DirectoryPhotoThumb({ kind, id, hasPhoto, alt, cacheKey = 0 }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    let objectUrl = null;
    setUrl(null);
    if (!hasPhoto || !id) return undefined;
    const fetchPhoto =
      kind === 'enlace'
        ? catalogsApi.directoryEnlacePhoto
        : catalogsApi.directoryPromotorPhoto;
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
  }, [kind, id, hasPhoto, cacheKey]);

  if (!hasPhoto) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">
        —
      </div>
    );
  }
  if (!url) {
    return <div className="h-12 w-12 animate-pulse rounded bg-slate-100" />;
  }
  return <img src={url} alt={alt} className="h-12 w-12 rounded object-cover ring-1 ring-slate-200" />;
}

function SeccionMultiSelect({ secciones, value, onChange }) {
  const [q, setQ] = useState('');
  const selected = useMemo(() => new Set((value || []).map(Number)), [value]);
  const filtered = useMemo(() => {
    const term = q.trim();
    if (!term) return secciones;
    return secciones.filter((s) => String(s.id).includes(term));
  }, [secciones, q]);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <div className="space-y-2">
      <input
        className="input"
        placeholder="Filtrar sección…"
        value={q}
        onChange={(e) => setQ(e.target.value.replace(/\D/g, ''))}
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 px-1 py-2">Sin coincidencias</p>
        ) : (
          filtered.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={selected.has(Number(s.id))}
                onChange={() => toggle(Number(s.id))}
              />
              <span>
                Sección {s.id}
                {s.distrito != null ? (
                  <span className="text-slate-400"> · D{s.distrito}</span>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>
      <p className="text-xs text-slate-500">{selected.size} sección(es) seleccionada(s)</p>
    </div>
  );
}

/** Gestión editable de enlaces (multi-sección) y promotores (1 sección). */
function DirectoryCrud() {
  const qc = useQueryClient();
  const ek = ['catalogs', 'directory-enlaces'];
  const pk = ['catalogs', 'directory-promotores'];

  const { data: enlaces = [], isLoading: loadingEnlaces, dataUpdatedAt: enlacesAt } = useQuery({
    queryKey: ek,
    queryFn: () => catalogsApi.directoryEnlaces(),
  });
  const { data: promotores = [], isLoading: loadingPromotores, dataUpdatedAt: promotoresAt } = useQuery({
    queryKey: pk,
    queryFn: () => catalogsApi.directoryPromotores(),
  });
  const { data: secciones = [] } = useQuery({
    queryKey: ['catalogs', 'secciones-table'],
    queryFn: () => catalogsApi.secciones(),
  });

  const seccionesSorted = useMemo(
    () => [...secciones].sort((a, b) => a.id - b.id),
    [secciones],
  );

  const [view, setView] = useState('enlaces');
  const [enlaceDialog, setEnlaceDialog] = useState(null);
  const [promotorDialog, setPromotorDialog] = useState(null);
  const [enlaceForm, setEnlaceForm] = useState({ full_name: '', seccion_ids: [] });
  const [promotorForm, setPromotorForm] = useState({
    full_name: '',
    seccion_id: '',
    phone: '',
    email: '',
    colonia: '',
    enlace_id: '',
  });
  const [filterQ, setFilterQ] = useState('');
  const [photoCrop, setPhotoCrop] = useState(null); // { kind, id, name, imageSrc }

  const closePhotoCrop = () => {
    if (photoCrop?.imageSrc) URL.revokeObjectURL(photoCrop.imageSrc);
    setPhotoCrop(null);
  };

  const openPhotoCrop = (kind, id, name, file) => {
    if (!file) return;
    const imageSrc = URL.createObjectURL(file);
    setPhotoCrop({ kind, id, name, imageSrc });
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ek });
    qc.invalidateQueries({ queryKey: pk });
    qc.invalidateQueries({ queryKey: ['map-directory'] });
  };

  const createEnlace = useMutation({
    mutationFn: () =>
      catalogsApi.createDirectoryEnlace({
        full_name: enlaceForm.full_name.trim(),
        seccion_ids: enlaceForm.seccion_ids,
      }),
    onSuccess: () => {
      toast.success('Enlace registrado');
      setEnlaceDialog(null);
      invalidate();
    },
  });

  const updateEnlace = useMutation({
    mutationFn: () =>
      catalogsApi.updateDirectoryEnlace(enlaceDialog.id, {
        full_name: enlaceForm.full_name.trim(),
        seccion_ids: enlaceForm.seccion_ids,
      }),
    onSuccess: () => {
      toast.success('Enlace actualizado');
      setEnlaceDialog(null);
      invalidate();
    },
  });

  const deleteEnlace = useMutation({
    mutationFn: (id) => catalogsApi.deleteDirectoryEnlace(id),
    onSuccess: () => {
      toast.success('Enlace eliminado');
      invalidate();
    },
  });

  const uploadEnlacePhoto = useMutation({
    mutationFn: ({ id, file }) => catalogsApi.uploadDirectoryEnlacePhoto(id, file),
    onSuccess: () => {
      toast.success('Foto de enlace actualizada');
      closePhotoCrop();
      invalidate();
    },
  });

  const createPromotor = useMutation({
    mutationFn: () =>
      catalogsApi.createDirectoryPromotor({
        full_name: promotorForm.full_name.trim(),
        seccion_id: Number(promotorForm.seccion_id),
        phone: promotorForm.phone.trim() || null,
        email: promotorForm.email.trim() || null,
        colonia: promotorForm.colonia.trim() || null,
        enlace_id: promotorForm.enlace_id ? Number(promotorForm.enlace_id) : null,
      }),
    onSuccess: () => {
      toast.success('Promotor registrado');
      setPromotorDialog(null);
      invalidate();
    },
  });

  const updatePromotor = useMutation({
    mutationFn: () =>
      catalogsApi.updateDirectoryPromotor(promotorDialog.id, {
        full_name: promotorForm.full_name.trim(),
        seccion_id: Number(promotorForm.seccion_id),
        phone: promotorForm.phone.trim() || null,
        email: promotorForm.email.trim() || null,
        colonia: promotorForm.colonia.trim() || null,
        enlace_id: promotorForm.enlace_id ? Number(promotorForm.enlace_id) : null,
        clear_enlace: !promotorForm.enlace_id,
      }),
    onSuccess: () => {
      toast.success('Promotor actualizado');
      setPromotorDialog(null);
      invalidate();
    },
  });

  const deletePromotor = useMutation({
    mutationFn: (id) => catalogsApi.deleteDirectoryPromotor(id),
    onSuccess: () => {
      toast.success('Promotor eliminado');
      invalidate();
    },
  });

  const uploadPromotorPhoto = useMutation({
    mutationFn: ({ id, file }) => catalogsApi.uploadDirectoryPromotorPhoto(id, file),
    onSuccess: () => {
      toast.success('Foto de promotor actualizada');
      closePhotoCrop();
      invalidate();
    },
  });

  const openCreateEnlace = () => {
    setEnlaceForm({ full_name: '', seccion_ids: [] });
    setEnlaceDialog({ mode: 'create' });
  };

  const openEditEnlace = (e) => {
    setEnlaceForm({
      full_name: e.full_name || '',
      seccion_ids: [...(e.seccion_ids || [])],
    });
    setEnlaceDialog({ mode: 'edit', id: e.id, has_photo: e.has_photo });
  };

  const openCreatePromotor = () => {
    setPromotorForm({
      full_name: '',
      seccion_id: '',
      phone: '',
      email: '',
      colonia: '',
      enlace_id: '',
    });
    setPromotorDialog({ mode: 'create' });
  };

  const openEditPromotor = (p) => {
    setPromotorForm({
      full_name: p.full_name || '',
      seccion_id: String(p.seccion_id ?? ''),
      phone: p.phone || '',
      email: p.email || '',
      colonia: p.colonia || '',
      enlace_id: p.enlace_id != null ? String(p.enlace_id) : '',
    });
    setPromotorDialog({ mode: 'edit', id: p.id, has_photo: p.has_photo });
  };

  const filteredEnlaces = useMemo(() => {
    const term = filterQ.trim().toLowerCase();
    if (!term) return enlaces;
    return enlaces.filter(
      (e) =>
        e.full_name.toLowerCase().includes(term) ||
        (e.seccion_ids || []).some((s) => String(s).includes(term)),
    );
  }, [enlaces, filterQ]);

  const filteredPromotores = useMemo(() => {
    const term = filterQ.trim().toLowerCase();
    if (!term) return promotores;
    return promotores.filter(
      (p) =>
        p.full_name.toLowerCase().includes(term) ||
        String(p.seccion_id).includes(term) ||
        (p.colonia || '').toLowerCase().includes(term) ||
        (p.enlace_name || '').toLowerCase().includes(term),
    );
  }, [promotores, filterQ]);

  return (
    <div className="card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Directorio operativo</h3>
          <p className="text-sm text-slate-500 mt-1">
            Un enlace cubre varias secciones; cada sección tiene un promotor. Los cambios se ven en el
            mapa al hacer clic en el polígono.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-lg ring-1 ring-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm rounded-md ${
                view === 'enlaces' ? 'bg-white shadow-sm text-brand-800 font-medium' : 'text-slate-600'
              }`}
              onClick={() => setView('enlaces')}
            >
              Enlaces ({enlaces.length})
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm rounded-md ${
                view === 'promotores'
                  ? 'bg-white shadow-sm text-brand-800 font-medium'
                  : 'text-slate-600'
              }`}
              onClick={() => setView('promotores')}
            >
              Promotores ({promotores.length})
            </button>
          </div>
          {view === 'enlaces' ? (
            <BtnPrimaryIcon title="Nuevo enlace" onClick={openCreateEnlace}>
              <IconPlus size={18} stroke={1.75} aria-hidden />
              Agregar enlace
            </BtnPrimaryIcon>
          ) : (
            <BtnPrimaryIcon title="Nuevo promotor" onClick={openCreatePromotor}>
              <IconPlus size={18} stroke={1.75} aria-hidden />
              Agregar promotor
            </BtnPrimaryIcon>
          )}
        </div>
      </div>

      <div>
        <input
          className="input max-w-md"
          placeholder={
            view === 'enlaces' ? 'Buscar enlace o sección…' : 'Buscar promotor, sección o colonia…'
          }
          value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)}
        />
      </div>

      {view === 'enlaces' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-600 border-b">
              <tr>
                <th className="px-3 py-2">Foto</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Secciones</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingEnlaces && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!loadingEnlaces && filteredEnlaces.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                    Sin enlaces
                  </td>
                </tr>
              )}
              {filteredEnlaces.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2">
                    <DirectoryPhotoThumb
                      kind="enlace"
                      id={e.id}
                      hasPhoto={e.has_photo}
                      alt={e.full_name}
                      cacheKey={enlacesAt}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800">{e.full_name}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {(e.seccion_ids || []).length
                      ? (e.seccion_ids || []).slice(0, 12).join(', ') +
                        ((e.seccion_ids || []).length > 12
                          ? ` (+${(e.seccion_ids || []).length - 12})`
                          : '')
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <label className="inline-flex cursor-pointer" title="Subir foto">
                        <span className="sr-only">Subir foto</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(ev) => {
                            const file = ev.target.files?.[0];
                            if (file) openPhotoCrop('enlace', e.id, e.full_name, file);
                            ev.target.value = '';
                          }}
                        />
                        <span className={`${iconBtnBase} ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50`}>
                          Foto
                        </span>
                      </label>
                      <EditIconButton onClick={() => openEditEnlace(e)} />
                      <DeleteIconButton
                        title="Eliminar enlace"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar el enlace "${e.full_name}"?`)) {
                            deleteEnlace.mutate(e.id);
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
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-600 border-b">
              <tr>
                <th className="px-3 py-2">Foto</th>
                <th className="px-3 py-2">Sección</th>
                <th className="px-3 py-2">Promotor</th>
                <th className="px-3 py-2">Enlace</th>
                <th className="px-3 py-2">Contacto</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingPromotores && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!loadingPromotores && filteredPromotores.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    Sin promotores
                  </td>
                </tr>
              )}
              {filteredPromotores.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">
                    <DirectoryPhotoThumb
                      kind="promotor"
                      id={p.id}
                      hasPhoto={p.has_photo}
                      alt={p.full_name}
                      cacheKey={promotoresAt}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800">{p.seccion_id}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{p.full_name}</div>
                    {p.colonia ? <div className="text-xs text-slate-500">{p.colonia}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{p.enlace_name || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">
                    <div>{p.phone || '—'}</div>
                    <div className="text-xs break-all">{p.email || ''}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <label className="inline-flex cursor-pointer" title="Subir foto">
                        <span className="sr-only">Subir foto</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(ev) => {
                            const file = ev.target.files?.[0];
                            if (file) openPhotoCrop('promotor', p.id, p.full_name, file);
                            ev.target.value = '';
                          }}
                        />
                        <span className={`${iconBtnBase} ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50`}>
                          Foto
                        </span>
                      </label>
                      <EditIconButton onClick={() => openEditPromotor(p)} />
                      <DeleteIconButton
                        title="Eliminar promotor"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar al promotor "${p.full_name}"?`)) {
                            deletePromotor.mutate(p.id);
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
      )}

      {enlaceDialog && (
        <CatalogModal
          wide
          title={enlaceDialog.mode === 'create' ? 'Nuevo enlace' : 'Editar enlace'}
          onClose={() => setEnlaceDialog(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="label">Nombre completo</label>
              <input
                className="input"
                value={enlaceForm.full_name}
                onChange={(e) => setEnlaceForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Secciones a cargo</label>
              <SeccionMultiSelect
                secciones={seccionesSorted}
                value={enlaceForm.seccion_ids}
                onChange={(ids) => setEnlaceForm((f) => ({ ...f, seccion_ids: ids }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setEnlaceDialog(null)}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={
                  !enlaceForm.full_name.trim() ||
                  createEnlace.isPending ||
                  updateEnlace.isPending
                }
                onClick={() =>
                  enlaceDialog.mode === 'create' ? createEnlace.mutate() : updateEnlace.mutate()
                }
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}

      {promotorDialog && (
        <CatalogModal
          wide
          title={promotorDialog.mode === 'create' ? 'Nuevo promotor' : 'Editar promotor'}
          onClose={() => setPromotorDialog(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="label">Nombre completo</label>
              <input
                className="input"
                value={promotorForm.full_name}
                onChange={(e) => setPromotorForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Sección</label>
                <input
                  className="input"
                  list="directory-promotor-secciones"
                  inputMode="numeric"
                  value={promotorForm.seccion_id}
                  onChange={(e) =>
                    setPromotorForm((f) => ({
                      ...f,
                      seccion_id: e.target.value.replace(/\D/g, ''),
                    }))
                  }
                />
                <datalist id="directory-promotor-secciones">
                  {seccionesSorted.map((s) => (
                    <option key={s.id} value={String(s.id)} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="label">Enlace (jefe)</label>
                <select
                  className="input"
                  value={promotorForm.enlace_id}
                  onChange={(e) => setPromotorForm((f) => ({ ...f, enlace_id: e.target.value }))}
                >
                  <option value="">Sin enlace</option>
                  {enlaces.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Colonia</label>
              <input
                className="input"
                value={promotorForm.colonia}
                onChange={(e) => setPromotorForm((f) => ({ ...f, colonia: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Teléfono</label>
                <input
                  className="input"
                  value={promotorForm.phone}
                  onChange={(e) => setPromotorForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Correo</label>
                <input
                  className="input"
                  type="email"
                  value={promotorForm.email}
                  onChange={(e) => setPromotorForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setPromotorDialog(null)}
              >
                Cancelar
              </button>
              <BtnPrimaryIcon
                disabled={
                  !promotorForm.full_name.trim() ||
                  !promotorForm.seccion_id ||
                  createPromotor.isPending ||
                  updatePromotor.isPending
                }
                onClick={() =>
                  promotorDialog.mode === 'create'
                    ? createPromotor.mutate()
                    : updatePromotor.mutate()
                }
              >
                <IconDeviceFloppy size={18} stroke={1.75} aria-hidden />
                Guardar
              </BtnPrimaryIcon>
            </div>
          </div>
        </CatalogModal>
      )}

      <PhotoCropModal
        open={Boolean(photoCrop)}
        imageSrc={photoCrop?.imageSrc}
        title={
          photoCrop
            ? `Ajustar foto · ${photoCrop.name || (photoCrop.kind === 'enlace' ? 'Enlace' : 'Promotor')}`
            : 'Ajustar foto'
        }
        saving={uploadEnlacePhoto.isPending || uploadPromotorPhoto.isPending}
        onCancel={closePhotoCrop}
        onConfirm={async (file) => {
          if (!photoCrop) return;
          if (photoCrop.kind === 'enlace') {
            await uploadEnlacePhoto.mutateAsync({ id: photoCrop.id, file });
          } else {
            await uploadPromotorPhoto.mutateAsync({ id: photoCrop.id, file });
          }
        }}
      />
    </div>
  );
}
