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

export interface DashboardTrafego {
  investimentoCentavos: number | null;
  /** Front = MC BR (RedTrack); null sem RedTrack */
  comissaoFrontCentavos: number | null;
  /** Call Center = 20% do vendido */
  comissaoCallCenterCentavos: number;
  /** Recuperação = (valor líquido × 0,70) × 5% */
  comissaoRecuperacaoCentavos: number;
  /** o que os afiliados recebem (regra por afiliado) */
  comissaoAfiliadosCentavos: number;
  /** Front + Call Center (Backend Outros, Recuperação e Afiliado ainda sem comissão); null sem RedTrack */
  comissaoTotalCentavos: number | null;
  receitaTotalCentavos: number;
  /** ROAS total × 100 (210 = 2,10): receita total de todos os grupos ÷ investimento; null sem investimento */
  roasTotalCentesimos: number | null;
  fonteInvestimento: 'REDTRACK' | 'NAO_CONFIGURADO' | 'ERRO';
  mensagem: string | null;
}

export const dashboardService = {
  trafego: getter<DashboardTrafego>('/dashboard/trafego'),
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
