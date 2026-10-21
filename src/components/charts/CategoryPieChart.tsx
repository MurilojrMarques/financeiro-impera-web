import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { formatInteger, formatPercentage } from '@/lib/formatters';
import { ChartFrame } from './ChartFrame';
import { axisCurrency, CHART_COLORS, ChartTooltip } from './chart-utils';

export interface PieDatum {
  name: string;
  value: number;
  color?: string;
  /** participação já calculada pela API (preferida); senão usamos value/total apenas para exibição */
  percent?: number | null;
}

interface Props {
  title: string;
  description?: string;
  data: PieDatum[];
  /** 'currency' (centavos) ou 'integer' (quantidades) */
  unit?: 'currency' | 'integer';
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  height?: number;
  /** nota fixa abaixo da legenda (ex.: backendTotal agregado) */
  footnote?: string;
}

/**
 * Rosca + legenda (não depende só de cor: cada fatia tem nome, valor e percentual em texto).
 * Layout pela LARGURA DO CARTÃO: estreito = rosca em cima e legenda abaixo; largo (≥ 32rem) = lado a lado.
 * A legenda também se adapta à sua própria largura: com ≥ 20rem cada item cabe em UMA linha (nome · valor · %);
 * abaixo disso usa duas linhas (nome e % / valor), então nenhum nome é truncado.
 */
export function CategoryPieChart({ title, description, data, unit = 'currency', loading, error, onRetry, height = 240, footnote }: Props) {
  const positivos = data.filter((d) => d.value > 0);
  const total = positivos.reduce((s, d) => s + d.value, 0);
  const fmt = (n: number) => (unit === 'currency' ? formatCurrency(n) : formatInteger(n));
  const pct = (d: PieDatum) => d.percent ?? (total > 0 && d.value > 0 ? (d.value / total) * 100 : null);
  const colorOf = (d: PieDatum, i: number) => d.color ?? CHART_COLORS[i % CHART_COLORS.length];

  return (
    <ChartFrame
      title={title}
      description={description}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={!loading && positivos.length === 0}
      height={height}
      autoHeight
      summary={`${title}: ${data.map((d) => `${d.name} ${fmt(d.value)}`).join('; ')}`}
      altTable={{ columns: ['Categoria', 'Valor', 'Participação'], rows: data.map((d) => [d.name, fmt(d.value), formatPercentage(pct(d))]) }}
    >
      <div role="img" aria-label={`${title}: ${data.map((d) => `${d.name} ${fmt(d.value)}`).join('; ')}`} className="flex flex-col gap-5 @lg:flex-row @lg:items-center">
        <div className="relative mx-auto size-40 shrink-0 @lg:size-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={positivos} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="94%" paddingAngle={2} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
                {positivos.map((d, i) => (
                  <Cell key={d.name} fill={colorOf(d, i)} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip formatValue={fmt} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</span>
            <span className="tabular text-base font-semibold leading-tight">{unit === 'currency' ? axisCurrency(total) : formatInteger(total)}</span>
          </div>
        </div>
        <div className="@container/legenda min-w-0 flex-1">
          <ul className="space-y-2.5 text-[13px]">
            {data.map((d, i) => (
              <li key={d.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-2.5 @xs/legenda:grid-cols-[auto_minmax(0,1fr)_8.25rem_3.25rem]">
                <span className="col-start-1 row-start-1 size-2.5 translate-y-px self-center rounded-sm" style={{ background: colorOf(d, i) }} aria-hidden="true" />
                <span className="col-start-2 row-start-1 font-medium [overflow-wrap:anywhere]">{d.name}</span>
                <span className="tabular col-start-3 row-start-1 text-right font-medium @xs/legenda:col-start-4">{formatPercentage(pct(d), 1)}</span>
                <span className="tabular col-span-2 col-start-2 row-start-2 text-xs text-muted-foreground @xs/legenda:col-span-1 @xs/legenda:col-start-3 @xs/legenda:row-start-1 @xs/legenda:text-right @xs/legenda:text-[13px] @xs/legenda:text-foreground">
                  {fmt(d.value)}
                </span>
              </li>
            ))}
            {footnote && <li className="border-t border-border/60 pt-2.5 text-xs leading-relaxed text-muted-foreground">{footnote}</li>}
          </ul>
        </div>
      </div>
    </ChartFrame>
  );
}
