import { useQueries, useQuery } from '@tanstack/react-query';
import { citizensApi, servicesApi, mapsApi } from '../api/index.js';
import { useAuth } from '../hooks/useAuth.jsx';

const STATUSES = ['PENDIENTE', 'EN_PROCESO', 'ATENDIDO', 'RECHAZADO'];
const COLORS = {
  PENDIENTE: 'bg-accent-100 text-accent-800',
  EN_PROCESO: 'bg-blue-100 text-blue-800',
  ATENDIDO: 'bg-emerald-100 text-emerald-800',
  RECHAZADO: 'bg-brand-100 text-brand-800',
};

function StatCard({ title, value, hint, color = 'text-brand-700' }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
      <div className="h-1 w-12 bg-accent-500 rounded-full mt-3" />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const canCitizens = hasPermission('citizens.read');
  const canMap = hasPermission('map.view');
  const canServices = hasPermission('services.read');

  const { data: citizens } = useQuery({
    queryKey: ['citizens-count'],
    queryFn: () => citizensApi.list({ page: 1, page_size: 1 }),
    enabled: canCitizens,
  });

  const { data: markers } = useQuery({
    queryKey: ['map-count'],
    queryFn: () => mapsApi.markers({ limit: 5000 }),
    enabled: canMap,
  });

  const statusQueries = useQueries({
    queries: STATUSES.map((s) => ({
      queryKey: ['svc', s],
      queryFn: () => servicesApi.list({ status_code: s, page: 1, page_size: 1 }),
      enabled: canServices,
    })),
  });

  const cards = [];
  if (canCitizens) {
    cards.push(<StatCard key="citizens" title="Ciudadanos" value={citizens?.total ?? '—'} />);
  }
  if (canMap) {
    cards.push(
      <StatCard
        key="geo"
        title="Geolocalizados"
        value={markers?.total ?? '—'}
        hint="Visualizables en el mapa"
      />,
    );
  }
  if (canServices) {
    STATUSES.forEach((s, i) => {
      cards.push(
        <StatCard
          key={s}
          title={`Servicios ${s.replaceAll('_', ' ').toLowerCase()}`}
          value={statusQueries[i]?.data?.total ?? '—'}
          color="text-slate-800"
        />,
      );
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-sm text-slate-500">Indicadores generales del sistema.</p>
      </header>

      {cards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{cards}</div>
      ) : (
        <div className="card text-sm text-slate-500">
          No hay indicadores disponibles para tu perfil. Solicita permisos adicionales si necesitas
          ver ciudadanos, mapa o servicios.
        </div>
      )}

      {canServices ? (
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-3">Distribución de servicios</h3>
          <div className="flex flex-wrap gap-3">
            {STATUSES.map((s, i) => (
              <span key={s} className={`badge ${COLORS[s]}`}>
                {s}: {statusQueries[i]?.data?.total ?? 0}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
