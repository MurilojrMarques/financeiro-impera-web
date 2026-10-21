import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { formatInteger, formatPercentage } from '@/lib/formatters';
import { ChartFrame } from './ChartFrame';
import { axisCurrency, CHART_COLORS, ChartTooltip } from './chart-utils';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  title: string;
  description?: string;
  data: BarDatum[];
  unit?: 'currency' | 'integer';
  /** 'vertical' (padrão) = ranking em barras horizontais, com rótulos longos truncados e valor/% ao lado; 'horizontal' = colunas */
  layout?: 'horizontal' | 'vertical';
  valueLabel?: string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  height?: number;
}

export function FinancialBarChart({ title, description, data, unit = 'currency', layout = 'vertical', valueLabel = 'Valor', loading, error, onRetry, height }: Props) {
  const fmt = (n: number) => (unit === 'currency' ? formatCurrency(n) : formatInteger(n));
  const axis = (n: number) => (unit === 'currency' ? axisCurrency(n) : formatInteger(n));
  const h = height ?? 260;
  const ranked = layout === 'vertical';
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  const total = data.reduce((a, d) => a + Math.max(0, d.value), 0); // só para % de participação entre as barras exibidas

  return (
    <ChartFrame
      title={title}
      description={description}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={!loading && data.length === 0}
      height={h}
      autoHeight={ranked}
      summary={`${title}: ${data.map((d) => `${d.label} ${fmt(d.value)}`).join('; ')}`}
      altTable={{ columns: ['Categoria', valueLabel], rows: data.map((d) => [d.label, fmt(d.value)]) }}
    >
      {ranked ? (
        <ol className="space-y-3.5" aria-label={title}>
          {data.map((d, i) => {
            const vazio = d.label === 'Não informado';
            return (
              <li key={`${d.label}-${i}`}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className={vazio ? 'min-w-0 truncate italic text-muted-foreground' : 'min-w-0 truncate text-foreground'} title={d.label}>
                    {d.label}
                  </span>
                  <span className="tabular shrink-0 whitespace-nowrap font-medium text-foreground">
                    {fmt(d.value)}
                    {total > 0 && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{formatPercentage((d.value / total) * 100, 1)}</span>}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, (Math.abs(d.value) / max) * 100)}%`, background: d.color ?? CHART_COLORS[0] }} />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="horizontal" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tickFormatter={axis} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={66} />
          <Tooltip cursor={{ fill: 'var(--surface)' }} content={<ChartTooltip formatValue={fmt} />} />
          <Bar dataKey="value" name={valueLabel} radius={4} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={d.label} fill={d.color ?? CHART_COLORS[0] ?? CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}
