import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  IconEye,
  IconEyeOff,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { supportsApi } from '../api/index.js';
import { useAuth } from '../hooks/useAuth.jsx';

const iconBtnBase =
  'inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none';

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

function Modal({ title, children, onClose }) {
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
          <button
            type="button"
            className={`${iconBtnBase} ring-1 ring-slate-300 text-slate-600 hover:bg-slate-100`}
            title="Cerrar"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <IconX size={18} stroke={1.75} aria-hidden />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

const emptyProgram = { name: '', code: '', description: '', is_active: true };
const emptyType = { program_id: '', name: '', code: '', description: '', is_active: true };

export default function SupportsPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canMutate = hasPermission('supports.write');
  const canDelete = hasPermission('supports.write');

  const [filterProgramId, setFilterProgramId] = useState('');
  const [filterTypeId, setFilterTypeId] = useState('');

  const [programModal, setProgramModal] = useState(null);
  const [typeModal, setTypeModal] = useState(null);
  const [programForm, setProgramForm] = useState(emptyProgram);
  const [typeForm, setTypeForm] = useState(emptyType);

  const { data: programs = [], ...programsQuery } = useQuery({
    queryKey: ['programs'],
    queryFn: supportsApi.programs,
  });
  const { data: types = [], ...typesQuery } = useQuery({
    queryKey: ['types'],
    queryFn: supportsApi.types,
  });

  const typesForApoyoFilter = useMemo(() => {
    if (!filterProgramId) return types;
    const pid = Number(filterProgramId);
    return types.filter((t) => (t.program_id ?? null) === pid);
  }, [types, filterProgramId]);

  useEffect(() => {
    if (!filterTypeId) return;
    const ok = typesForApoyoFilter.some((t) => String(t.id) === filterTypeId);
    if (!ok) setFilterTypeId('');
  }, [filterTypeId, typesForApoyoFilter]);

  /** Tipos de apoyo tras filtros (ordenados). */
  const filteredRows = useMemo(() => {
    let list = types;
    if (filterProgramId) {
      const pid = Number(filterProgramId);
      list = list.filter((t) => (t.program_id ?? null) === pid);
    }
    if (filterTypeId) {
      list = list.filter((t) => String(t.id) === filterTypeId);
    }
    return [...list].sort((a, b) => {
      const pa = programs.find((p) => p.id === a.program_id)?.name ?? '';
      const pb = programs.find((p) => p.id === b.program_id)?.name ?? '';
      if (pa !== pb) return pa.localeCompare(pb, 'es');
      return a.name.localeCompare(b.name, 'es');
    });
  }, [types, filterProgramId, filterTypeId, programs]);

  /** Programas que no tienen ningún tipo (para poder editarlos/eliminarlos). */
  const orphanPrograms = useMemo(() => {
    if (filterTypeId) return [];
    const used = new Set(types.map((t) => t.program_id).filter((id) => id != null));
    let list = programs.filter((p) => !used.has(p.id));
    if (filterProgramId) {
      const pid = Number(filterProgramId);
      list = list.filter((p) => p.id === pid);
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [programs, types, filterProgramId, filterTypeId]);

  const programById = useMemo(() => {
    const m = new Map();
    programs.forEach((p) => m.set(p.id, p));
    return m;
  }, [programs]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['programs'] });
    qc.invalidateQueries({ queryKey: ['types'] });
  };

  const createProgram = useMutation({
    mutationFn: () => supportsApi.createProgram(programForm),
    onSuccess: () => {
      toast.success('Programa registrado');
      setProgramModal(null);
      setProgramForm(emptyProgram);
      invalidateAll();
    },
  });

  const updateProgram = useMutation({
    mutationFn: ({ id }) => supportsApi.updateProgram(id, programForm),
    onSuccess: () => {
      toast.success('Programa actualizado');
      setProgramModal(null);
      setProgramForm(emptyProgram);
      invalidateAll();
    },
  });

  const deleteProgram = useMutation({
    mutationFn: (id) => supportsApi.deleteProgram(id),
    onSuccess: () => {
      toast.success('Programa eliminado');
      invalidateAll();
    },
  });

  const createType = useMutation({
    mutationFn: () =>
      supportsApi.createType({
        ...typeForm,
        program_id: typeForm.program_id ? Number(typeForm.program_id) : null,
      }),
    onSuccess: () => {
      toast.success('Apoyo registrado');
      setTypeModal(null);
      setTypeForm(emptyType);
      invalidateAll();
    },
  });

  const updateType = useMutation({
    mutationFn: ({ id }) =>
      supportsApi.updateType(id, {
        ...typeForm,
        program_id: typeForm.program_id ? Number(typeForm.program_id) : null,
      }),
    onSuccess: () => {
      toast.success('Apoyo actualizado');
      setTypeModal(null);
      setTypeForm(emptyType);
      invalidateAll();
    },
  });

  const deleteType = useMutation({
    mutationFn: (id) => supportsApi.deleteType(id),
    onSuccess: () => {
      toast.success('Apoyo eliminado');
      invalidateAll();
    },
  });

  const toggleTypeActive = useMutation({
    mutationFn: ({ id, is_active }) => supportsApi.updateType(id, { is_active }),
    onSuccess: () => {
      toast.success('Apoyo actualizado');
      invalidateAll();
    },
  });

  const openCreateProgram = () => {
    setProgramForm(emptyProgram);
    setProgramModal('create');
  };

  const openEditProgram = (p) => {
    setProgramForm({
      name: p.name,
      code: p.code || '',
      description: p.description || '',
      is_active: p.is_active,
    });
    setProgramModal({ edit: p });
  };

  const openCreateType = () => {
    setTypeForm({
      ...emptyType,
      program_id: filterProgramId || '',
    });
    setTypeModal('create');
  };

  const openEditType = (t) => {
    setTypeForm({
      program_id: t.program_id != null ? String(t.program_id) : '',
      name: t.name,
      code: t.code || '',
      description: t.description || '',
      is_active: t.is_active,
    });
    setTypeModal({ edit: t });
  };

  const submitProgram = () => {
    if (!programForm.name.trim()) {
      toast.error('El nombre del programa es obligatorio');
      return;
    }
    if (programModal === 'create') createProgram.mutate();
    else if (programModal?.edit) updateProgram.mutate({ id: programModal.edit.id });
  };

  const submitType = () => {
    if (!typeForm.name.trim()) {
      toast.error('El nombre del apoyo es obligatorio');
      return;
    }
    if (typeModal === 'create') createType.mutate();
    else if (typeModal?.edit) updateType.mutate({ id: typeModal.edit.id });
  };

  const handleDeleteProgram = (p) => {
    if (
      !window.confirm(
        `¿Eliminar el programa «${p.name}»? Los tipos de apoyo asociados quedarán sin programa.`,
      )
    )
      return;
    deleteProgram.mutate(p.id);
  };

  const handleDeleteType = (t) => {
    if (!window.confirm(`¿Eliminar el apoyo «${t.name}»?`)) return;
    deleteType.mutate(t.id);
  };

  const clearFilters = () => {
    setFilterProgramId('');
    setFilterTypeId('');
  };

  const filtersActive = Boolean(filterProgramId || filterTypeId);
  const loading = programsQuery.isLoading || typesQuery.isLoading;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Apoyos sociales</h2>
          <p className="text-sm text-slate-500">
            Programas y tipos de apoyo; filtra la tabla y registra desde los botones.
          </p>
        </div>
        {canMutate && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={openCreateProgram}>
              <IconPlus size={18} stroke={1.75} aria-hidden />
              Agregar programa
            </button>
            <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={openCreateType}>
              <IconPlus size={18} stroke={1.75} aria-hidden />
              Agregar apoyo
            </button>
          </div>
        )}
      </header>

      <section className="card space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Filtros</h3>
            <p className="text-sm text-slate-500">Por programa y tipo de apoyo.</p>
          </div>
          {filtersActive && (
            <button
              type="button"
              className="text-sm text-brand-700 hover:underline self-start"
              onClick={clearFilters}
            >
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          <div>
            <label className="label">Programa</label>
            <select
              className="input"
              value={filterProgramId}
              onChange={(e) => {
                setFilterProgramId(e.target.value);
                setFilterTypeId('');
              }}
            >
              <option value="">Todos los programas</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {!p.is_active ? ' (inactivo)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Apoyo (tipo)</label>
            <select
              className="input"
              value={filterTypeId}
              onChange={(e) => setFilterTypeId(e.target.value)}
            >
              <option value="">Todos los apoyos</option>
              {typesForApoyoFilter.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {!t.is_active ? ' (inactivo)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="card overflow-x-auto">
        <h3 className="font-semibold text-slate-800 mb-3 px-1">Tipos de apoyo</h3>
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-600 border-b">
            <tr>
              <th className="px-3 py-2">Programa</th>
              <th className="px-3 py-2">Apoyo</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Estado</th>
              {canMutate && (
                <th className="px-3 py-2 text-right whitespace-nowrap min-w-[10rem] align-middle">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr>
                <td colSpan={canMutate ? 5 : 4} className="px-3 py-8 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading &&
              orphanPrograms.map((prog) => (
                <tr key={`orphan-${prog.id}`} className="bg-amber-50/40">
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-nowrap items-center gap-1 min-w-0">
                      <span className="text-slate-800 font-medium truncate min-w-0">{prog.name}</span>
                      {canMutate && (
                        <>
                          <IconAction title="Editar programa" onClick={() => openEditProgram(prog)}>
                            <IconPencil size={16} stroke={1.75} aria-hidden />
                          </IconAction>
                          {canDelete && (
                            <IconAction
                              title="Eliminar programa"
                              onClick={() => handleDeleteProgram(prog)}
                              disabled={deleteProgram.isPending}
                              className="hover:text-red-700 hover:ring-red-200 hover:bg-red-50"
                            >
                              <IconTrash size={16} stroke={1.75} aria-hidden />
                            </IconAction>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-500 italic align-top" colSpan={3}>
                    Sin tipos de apoyo registrados — usa «Agregar apoyo» para asociar uno a este programa.
                  </td>
                  {canMutate && <td className="px-3 py-2 align-middle whitespace-nowrap w-[1%]" />}
                </tr>
              ))}
            {!loading &&
              filteredRows.map((t) => {
                const prog = t.program_id != null ? programById.get(t.program_id) : null;
                return (
                  <tr key={t.id} className={!t.is_active ? 'bg-slate-50/80' : ''}>
                    <td className="px-3 py-2 align-top">
                      {prog ? (
                        <div className="flex flex-nowrap items-center gap-1 min-w-0">
                          <span className="text-slate-800 truncate min-w-0">{prog.name}</span>
                          {canMutate && (
                            <>
                              <IconAction title="Editar programa" onClick={() => openEditProgram(prog)}>
                                <IconPencil size={16} stroke={1.75} aria-hidden />
                              </IconAction>
                              {canDelete && (
                                <IconAction
                                  title="Eliminar programa"
                                  onClick={() => handleDeleteProgram(prog)}
                                  disabled={deleteProgram.isPending}
                                  className="hover:text-red-700 hover:ring-red-200 hover:bg-red-50"
                                >
                                  <IconTrash size={16} stroke={1.75} aria-hidden />
                                </IconAction>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800 align-top">{t.name}</td>
                    <td className="px-3 py-2 align-top text-slate-600 max-w-xs truncate" title={t.description || ''}>
                      {t.description || '—'}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {t.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {canMutate && (
                      <td className="px-3 py-2 align-middle whitespace-nowrap w-[1%]">
                        <div className="inline-flex flex-nowrap justify-end items-center gap-1">
                          <IconAction title="Editar apoyo" onClick={() => openEditType(t)}>
                            <IconPencil size={18} stroke={1.75} aria-hidden />
                          </IconAction>
                          <IconAction
                            title={t.is_active ? 'Desactivar apoyo' : 'Activar apoyo'}
                            onClick={() =>
                              toggleTypeActive.mutate({ id: t.id, is_active: !t.is_active })
                            }
                            disabled={toggleTypeActive.isPending}
                            className={
                              t.is_active
                                ? 'hover:text-amber-800 hover:ring-amber-200/80 hover:bg-amber-50/80'
                                : 'hover:text-emerald-700 hover:ring-emerald-200/80 hover:bg-emerald-50/80'
                            }
                          >
                            {t.is_active ? (
                              <IconEyeOff size={18} stroke={1.75} aria-hidden />
                            ) : (
                              <IconEye size={18} stroke={1.75} aria-hidden />
                            )}
                          </IconAction>
                          {canDelete && (
                            <IconAction
                              title="Eliminar apoyo"
                              onClick={() => handleDeleteType(t)}
                              disabled={deleteType.isPending}
                              className="hover:text-red-700 hover:ring-red-200 hover:bg-red-50"
                            >
                              <IconTrash size={18} stroke={1.75} aria-hidden />
                            </IconAction>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!loading && filteredRows.length === 0 && orphanPrograms.length === 0 && (
          <p className="px-3 py-8 text-center text-slate-500 text-sm">
            No hay tipos de apoyo con estos filtros.
          </p>
        )}
      </div>

      {programModal && (
        <Modal
          title={programModal === 'create' ? 'Nuevo programa' : 'Editar programa'}
          onClose={() => {
            setProgramModal(null);
            setProgramForm(emptyProgram);
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="label">Nombre</label>
              <input
                className="input"
                value={programForm.name}
                onChange={(e) => setProgramForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del programa"
              />
            </div>
            <div>
              <label className="label">Código (opcional)</label>
              <input
                className="input"
                value={programForm.code}
                onChange={(e) => setProgramForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Código único"
              />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea
                className="input min-h-20"
                value={programForm.description}
                onChange={(e) => setProgramForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción breve"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={programForm.is_active}
                onChange={(e) => setProgramForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Programa activo
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setProgramModal(null);
                  setProgramForm(emptyProgram);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={createProgram.isPending || updateProgram.isPending}
                onClick={submitProgram}
              >
                {createProgram.isPending || updateProgram.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {typeModal && (
        <Modal
          title={typeModal === 'create' ? 'Nuevo apoyo' : 'Editar apoyo'}
          onClose={() => {
            setTypeModal(null);
            setTypeForm(emptyType);
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="label">Programa (opcional)</label>
              <select
                className="input"
                value={typeForm.program_id}
                onChange={(e) => setTypeForm((f) => ({ ...f, program_id: e.target.value }))}
              >
                <option value="">Sin programa</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nombre del apoyo</label>
              <input
                className="input"
                value={typeForm.name}
                onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Beca transporte"
              />
            </div>
            <div>
              <label className="label">Código (opcional)</label>
              <input
                className="input"
                value={typeForm.code}
                onChange={(e) => setTypeForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea
                className="input min-h-20"
                value={typeForm.description}
                onChange={(e) => setTypeForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={typeForm.is_active}
                onChange={(e) => setTypeForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Apoyo activo
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm ring-1 ring-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setTypeModal(null);
                  setTypeForm(emptyType);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={createType.isPending || updateType.isPending}
                onClick={submitType}
              >
                {createType.isPending || updateType.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
