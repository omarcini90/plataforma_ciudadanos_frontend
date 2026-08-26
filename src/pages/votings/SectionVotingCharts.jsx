/** Gráficas de resultados electorales (sección o agregado alcaldía / filtro). */

const NOSOTROS_COLOR = '#9f2241';
const ELLOS_COLOR = '#005494';

function fmt(n) {
  if (n == null || n === '') return '—';
  return Number(n).toLocaleString('es-MX');
}

function pct(n) {
  if (n == null || n === '') return '—';
  const v = Number(n);
  if (Number.isNaN(v)) return '—';
  const normalized = v <= 1 ? v * 100 : v;
  return `${normalized.toFixed(2)}%`;
}

function partyColor(party, fallback = '#64748b') {
  const colors = {
    PAN: '#005494',
    PRI: '#008000',
    PRD: '#f7c600',
    PVEM: '#006847',
    PT: '#da291c',
    MC: '#ff6600',
    MORENA: '#9f2241',
    ELIGE: '#7c3aed',
    PES: '#0891b2',
    RSP: '#475569',
    FXM: '#64748b',
    'PAN-PRI-PRD': '#1d4ed8',
    'PAN-PRI': '#2563eb',
    'PAN-PRD': '#3b82f6',
    'PRI-PRD': '#16a34a',
    'PT-MORENA': '#be123c',
    'PVEM-PT-MORENA': '#b91c1c',
  };
  return colors[party] ?? fallback;
}

/** Suma votos de varias secciones (mapa) en un solo payload de gráfica. */
export function aggregateVotingRows(rows = []) {
  let nosotros = 0;
  let ellos = 0;
  let total_votos = 0;
  const party_votes = {};

  for (const row of rows) {
    if (!row) continue;
    nosotros += Number(row.nosotros) || 0;
    ellos += Number(row.ellos) || 0;
    total_votos += Number(row.total_votos) || 0;
    for (const [party, votes] of Object.entries(row.party_votes ?? {})) {
      party_votes[party] = (party_votes[party] || 0) + (Number(votes) || 0);
    }
  }

  const a_favor = nosotros - ellos;
  const leading_party =
    Object.keys(party_votes).length > 0
      ? Object.entries(party_votes).sort((a, b) => b[1] - a[1])[0][0]
      : null;
  const leading_party_votes = leading_party ? party_votes[leading_party] : 0;

  return {
    nosotros,
    ellos,
    a_favor,
    total_votos,
    pct_nosotros: total_votos > 0 ? nosotros / total_votos : null,
    pct_ellos: total_votos > 0 ? ellos / total_votos : null,
    favor_status: a_favor > 0 ? 'win' : a_favor < 0 ? 'lose' : rows.length ? 'tie' : 'nodata',
    party_votes,
    leading_party,
    leading_party_votes,
    leading_party_pct: total_votos > 0 && leading_party ? leading_party_votes / total_votos : null,
    secciones: rows.length,
  };
}

function VerticalBars({ items, height = 180 }) {
  const max = Math.max(1, ...items.map((i) => Number(i.value) || 0));
  return (
    <div className="flex items-end justify-around gap-1 sm:gap-2" style={{ height }}>
      {items.map((item) => {
        const value = Number(item.value) || 0;
        const barH = Math.max(value > 0 ? 6 : 0, Math.round((value / max) * (height - 36)));
        return (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-semibold tabular-nums text-slate-700 sm:text-xs">
              {fmt(value)}
            </span>
            <div
              className="w-full max-w-[3.5rem] rounded-t transition-[height] duration-500 ease-out"
              style={{ height: barH, background: item.color }}
              title={`${item.label}: ${fmt(value)}`}
            />
            <span className="max-w-full truncate text-center text-[9px] font-medium uppercase tracking-wide text-slate-500 sm:text-[10px]">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBars({ items }) {
  const max = Math.max(1, ...items.map((i) => Number(i.value) || 0));
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const value = Number(item.value) || 0;
        const widthPct = Math.max(value > 0 ? 2 : 0, (value / max) * 100);
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="tabular-nums text-slate-600">
                {fmt(value)}
                {item.pct != null ? ` (${pct(item.pct)})` : ''}
              </span>
            </div>
            <div className="h-7 overflow-hidden rounded bg-slate-100">
              <div
                className="h-full rounded transition-[width] duration-500 ease-out"
                style={{ width: `${widthPct}%`, background: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * @param {{
 *   year: number,
 *   title: string,
 *   subtitle?: string,
 *   voting: object | null | undefined,
 *   detail?: object | null,
 *   detailLoading?: boolean,
 *   emptyMessage?: string,
 * }} props
 */
export default function SectionVotingCharts({
  year,
  title,
  subtitle,
  voting,
  detail,
  detailLoading,
  emptyMessage,
}) {
  const partyItems = Object.entries(voting?.party_votes ?? {})
    .map(([label, value]) => ({
      label,
      value: Number(value) || 0,
      color: partyColor(label),
    }))
    .sort((a, b) => b.value - a.value);

  const nosotros = voting?.nosotros ?? 0;
  const ellos = voting?.ellos ?? 0;
  const diferencia = (Number(nosotros) || 0) - (Number(ellos) || 0);
  const totalVotos = voting?.total_votos ?? detail?.total_votos ?? detail?.votacion_total_emitida ?? 0;
  const listaNominal = detail?.lista_nominal ?? null;
  const participacion =
    detail?.participacion_electoral ??
    (listaNominal && totalVotos ? Number(totalVotos) / Number(listaNominal) : null);

  const statusLabel =
    voting?.favor_status === 'win'
      ? 'A favor'
      : voting?.favor_status === 'lose'
        ? 'En contra'
        : voting?.favor_status === 'tie'
          ? 'Empate'
          : 'Sin datos';

  if (!voting || voting.favor_status === 'nodata') {
    return (
      <div className="card border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
        {emptyMessage || `Sin resultados de votación ${year} para este alcance.`}
      </div>
    );
  }

  return (
    <div className="card space-y-5 border-l-4 border-brand-600">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            {title}
            <span className="ml-2 text-sm font-normal text-slate-500">({year})</span>
          </h3>
          <p className="text-sm text-slate-500">
            {subtitle ? `${subtitle} · ` : ''}
            <span
              className={
                voting.favor_status === 'win'
                  ? 'font-medium text-emerald-700'
                  : voting.favor_status === 'lose'
                    ? 'font-medium text-red-700'
                    : 'font-medium text-slate-600'
              }
            >
              {statusLabel}
            </span>
            {voting.secciones != null ? (
              <span className="text-slate-400"> · {fmt(voting.secciones)} secciones</span>
            ) : null}
          </p>
        </div>
        {detailLoading && <span className="text-xs text-slate-400">Cargando detalle…</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Lista nominal</p>
          <p className="text-base font-semibold tabular-nums text-slate-800">{fmt(listaNominal)}</p>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">% Participación</p>
          <p className="text-base font-semibold tabular-nums text-slate-800">{pct(participacion)}</p>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Total votación</p>
          <p className="text-base font-semibold tabular-nums text-slate-800">{fmt(totalVotos)}</p>
        </div>
        <div className="rounded-md bg-rose-50 px-3 py-2 ring-1 ring-rose-100">
          <p className="text-[10px] uppercase tracking-wide text-rose-700">Nosotros</p>
          <p className="text-base font-semibold tabular-nums text-rose-900">{fmt(nosotros)}</p>
        </div>
        <div className="rounded-md bg-sky-50 px-3 py-2 ring-1 ring-sky-100">
          <p className="text-[10px] uppercase tracking-wide text-sky-700">Ellos</p>
          <p className="text-base font-semibold tabular-nums text-sky-900">{fmt(ellos)}</p>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Diferencia</p>
          <p
            className={`text-base font-semibold tabular-nums ${
              diferencia > 0 ? 'text-emerald-700' : diferencia < 0 ? 'text-red-700' : 'text-slate-800'
            }`}
          >
            {fmt(diferencia)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-700">
            {year} — Alcaldía por coalición
          </h4>
          <HorizontalBars
            items={[
              {
                label: 'Nosotros',
                value: nosotros,
                pct: voting.pct_nosotros,
                color: NOSOTROS_COLOR,
              },
              {
                label: 'Ellos',
                value: ellos,
                pct: voting.pct_ellos,
                color: ELLOS_COLOR,
              },
            ]}
          />
          <div className="mt-3 overflow-hidden rounded-md ring-1 ring-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Concepto</th>
                  <th className="px-3 py-2 font-medium text-right">Votos</th>
                  <th className="px-3 py-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3 py-2">Nosotros</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(nosotros)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct(voting.pct_nosotros)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Ellos</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(ellos)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct(voting.pct_ellos)}</td>
                </tr>
                <tr className="bg-slate-50 font-medium">
                  <td className="px-3 py-2">Diferencia</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(diferencia)}</td>
                  <td className="px-3 py-2 text-right">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-700">
            {year} —{' '}
            {year === 2024 ? 'Bloques / coaliciones' : 'Alcaldía por partido'}
            {voting.leading_party ? (
              <span className="ml-2 font-normal text-slate-500">
                Líder: {voting.leading_party} ({pct(voting.leading_party_pct)})
              </span>
            ) : null}
          </h4>
          {partyItems.length === 0 ? (
            <p className="text-sm text-slate-500">Sin desglose por partido para este alcance.</p>
          ) : (
            <VerticalBars items={partyItems} height={200} />
          )}
        </section>
      </div>
    </div>
  );
}
