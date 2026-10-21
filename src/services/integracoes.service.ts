import type { Params } from '@/lib/query-keys';
import type { ErroImportacao, Execucao, FonteDetalhe, IntegracaoStatus } from '@/types/financial.types';
import { apiGet, apiPost } from './api.client';
import { pagedGetter } from './report.helpers';

type Fonte = 'HISTORICO' | 'EVENTOS' | 'REDTRACK';

export const integracoesService = {
  status: (signal?: AbortSignal) => apiGet<IntegracaoStatus>('/integracoes/sheets/status', { signal }),
  execucoes: pagedGetter<Execucao>('/integracoes/sheets/execucoes'),
  erros: pagedGetter<ErroImportacao>('/integracoes/sheets/erros'),
  fontes: (params?: Params, signal?: AbortSignal) => apiGet<FonteDetalhe[]>('/integracoes/sheets/fontes', { params, signal }),
  /** 202: a execução segue em segundo plano; 409 SYNC_EM_ANDAMENTO se já houver uma. */
  sincronizar: (fonte?: Fonte) => apiPost<{ aceita: boolean; fontes: Fonte[]; modo: string }>('/integracoes/sheets/sincronizar', fonte ? { fonte } : {}),
  reconciliar: (fonte?: Fonte) => apiPost<{ aceita: boolean; fontes: Fonte[]; modo: string }>('/integracoes/sheets/reconciliar', fonte ? { fonte } : {}),
};
