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
  /** MC BR (RedTrack): a margem que sobra para a empresa, NÃO é comissão; null sem RedTrack */
  mcBrCentavos: number | null;
  /** comissão do Front = a do sistema de copy (apuração: 5% do MC BR de cada pessoa, com negativos); null se indisponível */
  comissaoFrontCentavos: number | null;
  /** o que se paga de fato (piso em 0 por pessoa) */
  comissaoFrontAPagarCentavos: number | null;
  comissaoFrontEstado: 'FECHADO' | 'PROVISORIO' | null;
  comissaoFrontMensagem: string | null;
  /** Call Center = 20% do vendido */
  comissaoCallCenterCentavos: number;
  /** Recuperação = (valor líquido × 0,70) × 5% */
  comissaoRecuperacaoCentavos: number;
  /** o que os afiliados recebem (regra por afiliado) */
  comissaoAfiliadosCentavos: number;
  /** Front (copy) + Call Center + Recuperação + Afiliados */
  comissaoTotalCentavos: number;
  /** true = a comissão do Front não entrou no total */
  comissaoTotalSemFront: boolean;
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
