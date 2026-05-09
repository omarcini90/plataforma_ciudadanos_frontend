import { useQuery } from '@tanstack/react-query';
import { logsApi } from '../api/index.js';

export default function LogsPage() {
  const { data, isPending } = useQuery({
    queryKey: ['logs'],
    queryFn: () => logsApi.list({ page: 1, page_size: 100 }),
  });

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Bitácora</h2>
        <p className="text-sm text-slate-500">Historial de operaciones del sistema.</p>
      </header>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-600 border-b">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Operación</th>
              <th className="px-3 py-2">Entidad</th>
              <th className="px-3 py-2">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isPending && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500 text-sm">
                  Cargando…
                </td>
              </tr>
            )}
            {!isPending && data?.items?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500 text-sm">
                  No hay registros en la bitácora. Las peticiones exitosas que modifican datos (POST,
                  PUT, PATCH, DELETE) quedarán registradas aquí.
                </td>
              </tr>
            )}
            {!isPending &&
              data?.items?.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-2">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-3 py-2">{l.user_id ?? '—'}</td>
                <td className="px-3 py-2">{l.operation}</td>
                <td className="px-3 py-2">{l.entity}</td>
                <td className="px-3 py-2 font-mono text-xs">{l.entity_id ?? '—'}</td>
              </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
