import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { ChartFrame } from './ChartFrame';
import { axisCurrency, axisPeriod, ChartTooltip, tooltipPeriod } from './chart-utils';

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  points: { periodo: string; centavos: number }[];
  /** começa oculta */
  hidden?: boolean;
}

interface Props {
  title: string;
  description?: string;
  series: LineSeries[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  height?: number;
}

/** Evolução temporal com séries que o usuário pode ligar/desligar. Os pontos já vêm prontos da API. */
export function RevenueLineChart({ title, description, series, loading, error, onRetry, height = 300 }: Props) {
  const [off, setOff] = useState<Set<string>>(() => new Set(series.filter((s) => s.hidden).map((s) => s.key)));

  const rows = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    for (const s of series) {
      for (const p of s.points) {
        const row = map.get(p.periodo) ?? { periodo: p.periodo };
        row[s.key] = p.centavos;
        map.set(p.periodo, row);
      }
    }
    return [...map.values()].sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)));
  }, [series]);

  const visible = series.filter((s) => !off.has(s.key));
  const toggle = (key: string) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <ChartFrame
      title={title}
      description={description}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={!loading && rows.length === 0}
      height={height}
      summary={`${title}: ${visible.map((s) => s.label).join(', ') || 'nenhuma série selecionada'}`}
      altTable={{
        columns: ['Período', ...visible.map((s) => s.label)],
        rows: rows.map((r) => [tooltipPeriod(String(r.periodo)), ...visible.map((s) => formatCurrency(typeof r[s.key] === 'number' ? (r[s.key] as number) : null))]),
      }}
      actions={
        series.length > 1 ? (
          <div className="no-print flex flex-wrap gap-1.5 sm:justify-end" role="group" aria-label="Séries exibidas">
            {series.map((s) => {
              const on = !off.has(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(s.key)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors pointer-coarse:py-2',
                    on ? 'border-input bg-surface text-foreground hover:bg-surface-hover' : 'border-border/60 text-muted-foreground line-through hover:text-foreground',
                  )}
                >
                  <span className="inline-block size-2 rounded-full" style={{ background: on ? s.color : 'transparent', border: `1px solid ${s.color}` }} aria-hidden="true" />
                  {s.label}
                </button>
              );
            })}
          </div>
        ) : undefined
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="periodo" tickFormatter={axisPeriod} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} minTickGap={32} />
          <YAxis tickFormatter={axisCurrency} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={66} />
          <Tooltip content={<ChartTooltip formatValue={(n) => formatCurrency(n)} formatLabel={tooltipPeriod} />} cursor={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.4 }} />
          <Legend wrapperStyle={{ display: 'none' }} />
          {visible.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
