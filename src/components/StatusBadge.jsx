const COLORS = {
  PENDIENTE: 'bg-accent-100 text-accent-800',
  EN_PROCESO: 'bg-blue-100 text-blue-800',
  ATENDIDO: 'bg-emerald-100 text-emerald-800',
  RECHAZADO: 'bg-brand-100 text-brand-800',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${COLORS[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}
