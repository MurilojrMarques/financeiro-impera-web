import type {
  CallCenterComissoes, CallCenterCustos, CallCenterResumo, DimRow, RecuperacaoRow, SerieRow, VendaItem,
} from '@/types/financial.types';
import type { CallCenterFechamento } from '@/types/fechamento.types';
import type { CallCenterReceitaCustos } from '@/types/trafego.types';
import { apiDelete, apiPut } from './api.client';
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
  /** exige FINANCEIRO/ADMIN; `mes` = AAAA-MM */
  fechamento: getter<CallCenterFechamento>('/call-center/fechamento'),
  /** fecha a competência (AAAA-MM) numa data (AAAA-MM-DD): dali em diante o fechamento mostra os pedidos como estavam no começo desse dia */
  fecharMes: (competencia: string, posicao: string) => apiPut('/call-center/fechamento/posicao', { competencia, posicao }),
  reabrirMes: (competencia: string) => apiDelete(`/call-center/fechamento/posicao?competencia=${encodeURIComponent(competencia)}`),
  evolucao: getter<SerieRow[]>('/call-center/evolucao'),
};
