import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { citizensApi, supportsApi } from '../../api/index.js';
import { useAuth } from '../../hooks/useAuth.jsx';

function SupportModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function CitizenDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManageSupports = hasPermission('supports.write');
  const iconActionClass =
    'inline-flex items-center justify-center rounded-md p-1.5 ring-1 ring-slate-200 hover:bg-slate-50 transition';

  const { data: citizen, isLoading } = useQuery({
    queryKey: ['citizen', id],
    queryFn: () => citizensApi.get(id),
  });
  const { data: programs } = useQuery({ queryKey: ['programs'], queryFn: supportsApi.programs });
  const { data: supportTypes = [] } = useQuery({
    queryKey: ['support-types'],
    queryFn: supportsApi.types,
  });
  const { data: supports } = useQuery({
    queryKey: ['supports', id],
    queryFn: () => supportsApi.byCitizen(id),
  });

  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [editingSupportId, setEditingSupportId] = useState(null);
  const [supportForm, setSupportForm] = useState({
    program_id: '',
    support_type_id: '',
    description: '',
    notes: '',
  });

  const filteredTypes = supportTypes.filter(
    (t) => !supportForm.program_id || String(t.program_id ?? '') === supportForm.program_id,
  );

  const resetSupportForm = () => {
    setEditingSupportId(null);
    setSupportForm({ program_id: '', support_type_id: '', description: '', notes: '' });
  };

  const invalidateSupports = () => {
    qc.invalidateQueries({ queryKey: ['supports', id] });
  };

  const assign = useMutation({
    mutationFn: () =>
      supportsApi.assign({
        citizen_id: Number(id),
        program_id: supportForm.program_id ? Number(supportForm.program_id) : null,
        support_type_id: supportForm.support_type_id ? Number(supportForm.support_type_id) : null,
        description: supportForm.description || null,
        notes: supportForm.notes || null,
      }),
    onSuccess: () => {
      toast.success('Apoyo asignado');
      resetSupportForm();
      setSupportModalOpen(false);
      invalidateSupports();
    },
  });

  const updateSupport = useMutation({
    mutationFn: () =>
      supportsApi.updateAssignment(editingSupportId, {
        program_id: supportForm.program_id ? Number(supportForm.program_id) : null,
        support_type_id: supportForm.support_type_id ? Number(supportForm.support_type_id) : null,
        description: supportForm.description || null,
        notes: supportForm.notes || null,
      }),
    onSuccess: () => {
      toast.success('Apoyo actualizado');
      resetSupportForm();
      setSupportModalOpen(false);
      invalidateSupports();
    },
  });

  const removeSupport = useMutation({
    mutationFn: (supportId) => supportsApi.removeAssignment(supportId),
    onSuccess: () => {
      toast.success('Apoyo eliminado');
      invalidateSupports();
    },
  });

  const openCreateSupport = () => {
    resetSupportForm();
    setSupportModalOpen(true);
  };

  const openEditSupport = (s) => {
    setEditingSupportId(s.id);
    setSupportForm({
      program_id: s.program_id != null ? String(s.program_id) : '',
      support_type_id: s.support_type_id != null ? String(s.support_type_id) : '',
      description: s.description || '',
      notes: s.notes || '',
    });
    setSupportModalOpen(true);
  };

  const submitSupport = () => {
    if (editingSupportId) updateSupport.mutate();
    else assign.mutate();
  };

  const programById = new Map((programs || []).map((p) => [p.id, p]));
  const typeById = new Map((supportTypes || []).map((t) => [t.id, t]));

  if (isLoading) return <p className="text-slate-500">Cargando…</p>;
  if (!citizen) return <p>Sin datos</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {citizen.nombre} {citizen.apellido_paterno} {citizen.apellido_materno || ''}
          </h2>
          <p className="text-sm text-slate-500 font-mono">{citizen.curp}</p>
        </div>
        <Link to={`/citizens/${id}/edit`} className="btn-secondary shrink-0">
          Editar datos
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-3">Datos</h3>
          <dl className="text-sm grid grid-cols-2 gap-y-2">
            <dt className="text-slate-500">Sexo</dt><dd>{citizen.sexo}</dd>
            <dt className="text-slate-500">Nacimiento</dt><dd>{citizen.fecha_nacimiento || '-'}</dd>
            <dt className="text-slate-500">Clave elector</dt><dd>{citizen.clave_elector || '-'}</dd>
            <dt className="text-slate-500">OCR</dt><dd>{citizen.ocr || '-'}</dd>
            <dt className="text-slate-500">Sección</dt><dd>{citizen.seccion_electoral || '-'}</dd>
            <dt className="text-slate-500">Teléfono</dt><dd>{citizen.telefono || '-'}</dd>
            <dt className="text-slate-500">Correo</dt><dd>{citizen.correo || '-'}</dd>
          </dl>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Domicilio</h3>
          {citizen.addresses?.[0] ? (
            <div className="text-sm space-y-1">
              <p>
                {citizen.addresses[0].calle} {citizen.addresses[0].numero},{' '}
                {citizen.addresses[0].colonia}
              </p>
              <p>
                {citizen.addresses[0].municipio}, {citizen.addresses[0].estado} ·{' '}
                {citizen.addresses[0].codigo_postal}
              </p>
              <p className="text-xs text-slate-500">
                Lat {citizen.addresses[0].latitud ?? '-'} · Lng {citizen.addresses[0].longitud ?? '-'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sin dirección registrada</p>
          )}
        </div>
      </div>

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold">Programas y apoyos asignados</h3>
            <p className="text-xs text-slate-500">
              Un programa puede tener varios apoyos (tipos) para el mismo ciudadano.
            </p>
          </div>
          {canManageSupports && (
            <button type="button" className="btn-primary" onClick={openCreateSupport}>
              Asignar apoyo
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-600 border-b">
              <tr>
                <th className="px-3 py-2">Programa</th>
                <th className="px-3 py-2">Apoyo</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2">Solicitado</th>
                <th className="px-3 py-2">Notas</th>
                {canManageSupports && <th className="px-3 py-2 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {supports?.length ? (
                supports.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2">
                      {s.program_id ? programById.get(s.program_id)?.name || `#${s.program_id}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {s.support_type_id
                        ? typeById.get(s.support_type_id)?.name || `#${s.support_type_id}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">{s.description || '—'}</td>
                    <td className="px-3 py-2">
                      {s.requested_at ? new Date(s.requested_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2">{s.notes || '—'}</td>
                    {canManageSupports && (
                      <td className="px-3 py-2 text-right space-x-2">
                        <button
                          type="button"
                          title="Editar apoyo"
                          aria-label="Editar apoyo"
                          className={`${iconActionClass} text-brand-700`}
                          onClick={() => openEditSupport(s)}
                        >
                          <IconPencil size={16} stroke={1.75} aria-hidden />
                        </button>
                        <button
                          type="button"
                          title="Eliminar apoyo"
                          aria-label="Eliminar apoyo"
                          className={`${iconActionClass} text-red-600`}
                          onClick={() => {
                            if (!window.confirm('¿Eliminar este apoyo asignado?')) return;
                            removeSupport.mutate(s.id);
                          }}
                        >
                          <IconTrash size={16} stroke={1.75} aria-hidden />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={canManageSupports ? 6 : 5}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    Aún no hay apoyos asociados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SupportModal
        open={supportModalOpen}
        title={editingSupportId ? 'Editar apoyo asignado' : 'Asignar apoyo'}
        onClose={() => {
          setSupportModalOpen(false);
          resetSupportForm();
        }}
      >
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="label">Programa</label>
            <select
              className="input"
              value={supportForm.program_id}
              onChange={(e) =>
                setSupportForm((f) => ({
                  ...f,
                  program_id: e.target.value,
                  support_type_id: '',
                }))
              }
            >
              <option value="">Sin programa</option>
              {programs?.map((p) => (
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
              value={supportForm.support_type_id}
              onChange={(e) => setSupportForm((f) => ({ ...f, support_type_id: e.target.value }))}
            >
              <option value="">Sin tipo de apoyo</option>
              {filteredTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Descripción</label>
            <input
              className="input"
              placeholder="Descripción del apoyo"
              value={supportForm.description}
              onChange={(e) => setSupportForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea
              className="input min-h-20"
              placeholder="Notas adicionales"
              value={supportForm.notes}
              onChange={(e) => setSupportForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <div className="pt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSupportModalOpen(false);
              resetSupportForm();
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={assign.isPending || updateSupport.isPending}
            onClick={submitSupport}
          >
            {editingSupportId ? 'Guardar cambios' : 'Asignar apoyo'}
          </button>
        </div>
      </SupportModal>
    </div>
  );
}
