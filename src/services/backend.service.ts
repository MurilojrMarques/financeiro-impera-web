import type { BackendTotal, CanalRow, DimRow, ResumoComAlertas, SerieRow, VendaItem } from '@/types/financial.types';
import { getter, pagedGetter } from './report.helpers';

/** `/backend` = BACKEND_OUTROS (NÃO inclui Call Center). `total` traz o agregado backendTotal. */
export const backendService = {
  resumo: getter<ResumoComAlertas>('/backend/resumo'),
  total: getter<BackendTotal>('/backend/total'),
  vendas: pagedGetter<VendaItem>('/backend/vendas'),
  porCanal: getter<CanalRow[]>('/backend/por-canal'),
  porOrigem: getter<DimRow[]>('/backend/por-origem'),
  porLoja: getter<DimRow[]>('/backend/por-loja'),
  porProduto: getter<DimRow[]>('/backend/por-produto'),
  evolucao: getter<SerieRow[]>('/backend/evolucao'),
  naoClassificadas: pagedGetter<VendaItem>('/backend/nao-classificadas'),
};
