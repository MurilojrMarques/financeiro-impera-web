import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { ChartFrame } from './ChartFrame';
import { axisCurrency, ChartTooltip } from './chart-utils';

export interface ComparisonDatum {
  label: string;
  atual: number;
  anterior: number;
}

interface Props {
  title: string;
  description?: string;
  data: ComparisonDatum[];
  atualLabel?: string;
  anteriorLabel?: string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** texto quando não há dados (ex.: orientar a ativar a comparação) */
  emptyText?: string;
}

/** Barras agrupadas: período atual × período de comparação (centavos). */
export function ComparisonChart({ title, description, data, atualLabel = 'Período atual', anteriorLabel = 'Comparação', loading, error, onRetry, emptyText }: Props) {
  return (
    <ChartFrame
      title={title}
      description={description}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={!loading && data.length === 0}
      emptyText={emptyText}
      summary={`${title}: ${data.map((d) => `${d.label} ${formatCurrency(d.atual)} contra ${formatCurrency(d.anterior)}`).join('; ')}`}
      altTable={{ columns: ['Indicador', atualLabel, anteriorLabel], rows: data.map((d) => [d.label, formatCurrency(d.atual), formatCurrency(d.anterior)]) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
          <YAxis tickFormatter={axisCurrency} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={66} />
          <Tooltip cursor={{ fill: 'var(--surface)' }} content={<ChartTooltip formatValue={(n) => formatCurrency(n)} />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="atual" name={atualLabel} fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="anterior" name={anteriorLabel} fill="var(--chart-6)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
