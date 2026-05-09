import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { citizensApi } from '../../api/index.js';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function CitizensListPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('citizens.write');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['citizens', q, page],
    queryFn: () => citizensApi.list({ q: q || undefined, page, page_size: pageSize }),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ciudadanos</h2>
          <p className="text-sm text-slate-500">Búsqueda y administración del padrón.</p>
        </div>
        {canWrite && (
          <Link to="/citizens/new" className="btn-primary">
            + Nuevo ciudadano
          </Link>
        )}
      </header>

      <div className="card">
        <div className="flex gap-2 mb-4">
          <input
            className="input"
            placeholder="Buscar por nombre, CURP o clave de elector…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">CURP</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Sección</th>
                <th className="px-3 py-2">Estatus</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Cargando…
                  </td>
                </tr>
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Sin resultados
                  </td>
                </tr>
              ) : (
                data?.items?.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs">{c.curp}</td>
                    <td className="px-3 py-2">
                      {c.nombre} {c.apellido_paterno} {c.apellido_materno || ''}
                    </td>
                    <td className="px-3 py-2">{c.seccion_electoral || '-'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`badge ${
                          c.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {c.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link to={`/citizens/${c.id}`} className="text-brand-600 hover:underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center mt-4 text-sm">
          <span className="text-slate-500">
            {data?.total ?? 0} resultados · Página {page}
          </span>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </button>
            <button
              className="btn-secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data || page * pageSize >= (data.total ?? 0)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
