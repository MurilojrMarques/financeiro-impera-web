import type { ConversaoUpsell, DimRow, FrontResumo, SerieRow, VendaItem } from '@/types/financial.types';
import { getter, pagedGetter } from './report.helpers';

export const frontService = {
  resumo: getter<FrontResumo>('/front/resumo'),
  vendas: pagedGetter<VendaItem>('/front/vendas'),
  compras: pagedGetter<VendaItem>('/front/compras'),
  upsells: pagedGetter<VendaItem>('/front/upsells'),
  downsells: pagedGetter<VendaItem>('/front/downsells'),
  conversaoUpsell: getter<ConversaoUpsell>('/front/conversao-upsell'),
  porLoja: getter<DimRow[]>('/front/por-loja'),
  porProduto: getter<DimRow[]>('/front/por-produto'),
  porCampanha: getter<DimRow[]>('/front/por-campanha'),
  porAnuncio: getter<DimRow[]>('/front/por-anuncio'),
  evolucao: getter<SerieRow[]>('/front/evolucao'),
};
