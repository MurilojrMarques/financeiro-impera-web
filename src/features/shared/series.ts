import type { LineSeries } from '@/components/charts/RevenueLineChart';
import type { SerieRow } from '@/types/financial.types';

/** Série da API (já agregada por dia) -> pontos do gráfico. Nenhuma soma é feita aqui. */
export function toLineSeries(key: string, label: string, color: string, rows: SerieRow[] | undefined, pick: (r: SerieRow) => number = (r) => r.receitaCentavos): LineSeries {
  return { key, label, color, points: (rows ?? []).map((r) => ({ periodo: r.periodo, centavos: pick(r) })) };
}
