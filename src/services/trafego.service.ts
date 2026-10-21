import type { TrafegoParametros, TrafegoResumo } from '@/types/trafego.types';
import { apiGet, apiPut } from './api.client';
import { getter } from './report.helpers';

export const trafegoService = {
  resumo: getter<TrafegoResumo>('/trafego/resumo'),
  parametros: (signal?: AbortSignal) => apiGet<{ parametros: TrafegoParametros; padrao: TrafegoParametros }>('/trafego/parametros', { signal }),
  salvarParametros: (p: TrafegoParametros) => apiPut<{ parametros: TrafegoParametros }>('/trafego/parametros', p),
};
