import type { DimRow, ReembolsosResumo, SerieRow, VendaItem } from '@/types/financial.types';
import { getter, pagedGetter } from './report.helpers';

export const reembolsosService = {
  listar: pagedGetter<VendaItem>('/reembolsos'),
  resumo: getter<ReembolsosResumo>('/reembolsos/resumo'),
  estornos: pagedGetter<VendaItem>('/reembolsos/estornos'),
  chargebacks: pagedGetter<VendaItem>('/reembolsos/chargebacks'),
  porLoja: getter<DimRow[]>('/reembolsos/por-loja'),
  porGrupo: getter<DimRow[]>('/reembolsos/por-grupo'),
  evolucao: getter<SerieRow[]>('/reembolsos/evolucao'),
};
