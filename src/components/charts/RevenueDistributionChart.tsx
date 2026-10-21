import { grupoLabel } from '@/lib/formatters';
import type { DistribuicaoReceitas } from '@/types/financial.types';
import { CategoryPieChart } from './CategoryPieChart';
import { GROUP_COLORS } from './chart-utils';

interface Props {
  distribuicao?: DistribuicaoReceitas;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

/**
 * Participação dos grupos MUTUAMENTE EXCLUSIVOS (Front, Back-end Outros, Call Center, Afiliados, Não classificadas).
 * O backendTotal é um agregado (Back-end Outros + Call Center) e NÃO é uma fatia: aparece só como nota.
 */
export function RevenueDistributionChart({ distribuicao, loading, error, onRetry }: Props) {
  const data = (distribuicao?.distribuicao ?? []).map((d) => ({
    name: grupoLabel(d.grupo),
    value: d.receitaCentavos,
    percent: d.participacaoPercentual,
    color: GROUP_COLORS[d.grupo],
  }));
  return (
    <CategoryPieChart
      title="Distribuição das receitas"
      description="Grupos mutuamente exclusivos"
      data={data}
      loading={loading}
      error={error}
      onRetry={onRetry}
      footnote="Back-end Total = Back-end Outros + Call Center (indicador agregado, não é somado novamente)."
    />
  );
}
