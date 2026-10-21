import type {
  CallCenterComissoes, CallCenterCustos, CallCenterResumo, DimRow, RecuperacaoRow, SerieRow, VendaItem,
} from '@/types/financial.types';
import type { CallCenterReceitaCustos } from '@/types/trafego.types';
import { getter, pagedGetter } from './report.helpers';

export const callCenterService = {
  resumo: getter<CallCenterResumo>('/call-center/resumo'),
  vendas: pagedGetter<VendaItem>('/call-center/vendas'),
  porAtendente: getter<DimRow[]>('/call-center/por-atendente'),
  porLoja: getter<DimRow[]>('/call-center/por-loja'),
  porProduto: getter<DimRow[]>('/call-center/por-produto'),
  porMetodo: getter<DimRow[]>('/call-center/por-metodo'),
  porTipoAtendimento: getter<DimRow[]>('/call-center/por-tipo-atendimento'),
  recuperacoes: getter<RecuperacaoRow[]>('/call-center/recuperacoes'),
  comissoes: getter<CallCenterComissoes>('/call-center/comissoes'),
  receitaCustos: getter<CallCenterReceitaCustos>('/call-center/receita-custos'),
  /** exige FINANCEIRO/ADMIN */
  custos: getter<CallCenterCustos>('/call-center/custos'),
  evolucao: getter<SerieRow[]>('/call-center/evolucao'),
};
