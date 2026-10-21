import { formatDate } from '@/lib/dates';

export const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'] as const;

export const GROUP_COLORS: Record<string, string> = {
  FRONT: 'var(--chart-1)',
  BACKEND_OUTROS: 'var(--chart-2)',
  CALL_CENTER: 'var(--chart-3)',
  RECUPERACAO: 'var(--chart-5)',
  AFILIADO: 'var(--chart-4)',
  NAO_CLASSIFICADA: 'var(--chart-6)',
};

const compact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
/** Eixo Y: "R$ 12 mil" (apenas apresentação do eixo). */
export const axisCurrency = (centavos: number): string => compact.format(centavos / 100);

/** "2026-10-05" -> "05/10"; "2026-10" -> "10/2026"; "14:00" permanece. */
export function axisPeriod(periodo: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodo)) return formatDate(periodo).slice(0, 5);
  if (/^\d{4}-\d{2}$/.test(periodo)) return `${periodo.slice(5)}/${periodo.slice(0, 4)}`;
  return periodo;
}

export function tooltipPeriod(periodo: string | number | undefined): string {
  const p = String(periodo ?? '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return formatDate(p);
  return axisPeriod(p);
}

export interface TipPayload {
  name?: string | number;
  value?: number | string | null;
  color?: string;
  dataKey?: string | number;
}

interface TipProps {
  active?: boolean;
  payload?: readonly TipPayload[];
  label?: string | number;
  formatValue: (n: number) => string;
  formatLabel?: (l: string | number | undefined) => string;
}

export function ChartTooltip({ active, payload, label, formatValue, formatLabel }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover px-3 py-2.5 text-xs shadow-xl shadow-black/40">
      {label !== undefined && <p className="mb-1.5 font-medium">{formatLabel ? formatLabel(label) : String(label)}</p>}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden="true" />
              {p.name}
            </span>
            <span className="tabular font-medium">{typeof p.value === 'number' ? formatValue(p.value) : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
