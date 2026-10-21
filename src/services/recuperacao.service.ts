import type { DimRow, ResumoComAlertas, SerieRow, VendaItem } from '@/types/financial.types';
import { getter, pagedGetter } from './report.helpers';

/** `/recuperacao` = grupo RECUPERACAO (time interno que vende sem a taxa de 20% do call center). */
export const recuperacaoService = {
  resumo: getter<ResumoComAlertas>('/recuperacao/resumo'),
  vendas: pagedGetter<VendaItem>('/recuperacao/vendas'),
  porVendedor: getter<DimRow[]>('/recuperacao/por-vendedor'),
  porLoja: getter<DimRow[]>('/recuperacao/por-loja'),
  porProduto: getter<DimRow[]>('/recuperacao/por-produto'),
  porMetodo: getter<DimRow[]>('/recuperacao/por-metodo'),
  evolucao: getter<SerieRow[]>('/recuperacao/evolucao'),
};
