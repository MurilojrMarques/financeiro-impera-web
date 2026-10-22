import type {
  DashboardKpis, DashboardResumo, DimRow, DistribuicaoReceitas, Indicador, ReceitasPorGrupo, SerieRow,
} from '@/types/financial.types';
import { getter } from './report.helpers';

export interface ComparativoDashboard {
  atual: { periodo: { de: string; ate: string } } & DashboardKpisLike;
  anterior: { periodo: { de: string; ate: string } } & DashboardKpisLike;
  variacaoPercentual: Record<'receita' | 'pedidos' | 'comissao' | 'estornos' | 'chargebacks', number | null>;
}
type DashboardKpisLike = Omit<DashboardKpis, 'custos'>;

export const dashboardService = {
  resumo: getter<DashboardResumo>('/dashboard/resumo'),
  kpis: getter<DashboardKpis>('/dashboard/kpis'),
  evolucao: getter<SerieRow[]>('/dashboard/evolucao'),
  comparativo: getter<ComparativoDashboard>('/dashboard/comparativo'),
  distribuicao: getter<DistribuicaoReceitas>('/dashboard/distribuicao-receitas'),
  receitasPorGrupo: getter<ReceitasPorGrupo>('/dashboard/receitas-por-grupo'),
  receitasPorLoja: getter<DimRow[]>('/dashboard/receitas-por-loja'),
  indicadores: getter<Indicador[]>('/dashboard/indicadores'),
  /** só os nomes existentes no período (lista de filtros), sem calcular relatório */
  opcoes: getter<string[]>('/dashboard/opcoes'),
};
