import type { CampanhasResumo, DimRow, RedtrackConciliacao, RedtrackConversao, RedtrackDivergencia } from '@/types/financial.types';
import { getter, pagedGetter } from './report.helpers';

export const campanhasService = {
  porCampanha: getter<DimRow[]>('/campanhas'),
  resumo: getter<CampanhasResumo>('/campanhas/resumo'),
  porAnuncio: getter<DimRow[]>('/campanhas/por-anuncio'),
  porLoja: getter<DimRow[]>('/campanhas/por-loja'),
  conversoes: pagedGetter<RedtrackConversao>('/redtrack/conversoes'),
  conciliacao: getter<RedtrackConciliacao>('/redtrack/conciliacao'),
  divergencias: pagedGetter<RedtrackDivergencia>('/redtrack/divergencias'),
};
