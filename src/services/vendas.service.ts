import type { DimRow, ResumoComAlertas, SerieRow, VendaItem } from '@/types/financial.types';
import { getter, pagedGetter } from './report.helpers';

export const vendasService = {
  listar: pagedGetter<VendaItem>('/vendas'),
  resumo: getter<ResumoComAlertas>('/vendas/resumo'),
  porDia: getter<SerieRow[]>('/vendas/por-dia'),
  porHora: getter<SerieRow[]>('/vendas/por-hora'),
  porSemana: getter<SerieRow[]>('/vendas/por-semana'),
  porLoja: getter<DimRow[]>('/vendas/por-loja'),
  porProduto: getter<DimRow[]>('/vendas/por-produto'),
  porMetodo: getter<DimRow[]>('/vendas/por-metodo'),
  porStatus: getter<DimRow[]>('/vendas/por-status'),
  porOrigem: getter<DimRow[]>('/vendas/por-origem'),
};
