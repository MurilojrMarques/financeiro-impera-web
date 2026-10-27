import type { ComissoesResumo } from '@/types/comissoes.types';
import { getter } from './report.helpers';

export const comissoesService = {
  resumo: getter<ComissoesResumo>('/comissoes/resumo'),
};
