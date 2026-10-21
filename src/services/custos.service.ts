import type { Params } from '@/lib/query-keys';
import type { AnexoCusto, CategoriaCusto, Custo, CustosResumo, Periodicidade, RecorrenciaCusto, RegraCusto, StatusPagamentoCusto } from '@/types/financial.types';
import { apiDelete, apiDownload, apiGet, apiPatch, apiPost, apiUpload } from './api.client';
import { pagedGetter } from './report.helpers';

export interface NovoCusto {
  descricao: string;
  tipo: 'FIXO' | 'VARIAVEL';
  categoriaId: string;
  recorrenciaId?: string;
  grupo?: string;
  valorCentavos: number;
  vencimento: string; // AAAA-MM-DD
  statusPagamento: StatusPagamentoCusto;
  observacao?: string;
}

export type AtualizarCusto = Partial<Omit<NovoCusto, 'recorrenciaId' | 'grupo'>> & { recorrenciaId?: string | null; grupo?: string | null };

export const custosService = {
  listar: pagedGetter<Custo>('/custos'),
  resumo: (params?: Params, signal?: AbortSignal) => apiGet<CustosResumo>('/custos/resumo', { params, signal }),
  obter: (id: string, signal?: AbortSignal) => apiGet<Custo>(`/custos/${id}`, { signal }),
  criar: (c: NovoCusto) => apiPost<Custo>('/custos', c),
  atualizar: (id: string, c: AtualizarCusto) => apiPatch<Custo>(`/custos/${id}`, c),
  remover: (id: string) => apiDelete(`/custos/${id}`),

  regrasCusto: (signal?: AbortSignal) => apiGet<RegraCusto[]>('/financeiro/regras-custo', { signal }),

  categorias: (signal?: AbortSignal) => apiGet<CategoriaCusto[]>('/custos/categorias', { signal }),
  criarCategoria: (nome: string) => apiPost<CategoriaCusto>('/custos/categorias', { nome }),
  atualizarCategoria: (id: string, c: { nome?: string; ativa?: boolean }) => apiPatch<CategoriaCusto>(`/custos/categorias/${id}`, c),

  recorrencias: (signal?: AbortSignal) => apiGet<RecorrenciaCusto[]>('/custos/recorrencias', { signal }),
  criarRecorrencia: (r: { periodicidade: Periodicidade; inicio: string; fim?: string }) => apiPost<RecorrenciaCusto>('/custos/recorrencias', r),

  anexos: (id: string, signal?: AbortSignal) => apiGet<AnexoCusto[]>(`/custos/${id}/anexos`, { signal }),
  enviarAnexo: (id: string, arquivo: File) => apiUpload<AnexoCusto>(`/custos/${id}/anexos`, 'arquivo', arquivo),
  baixarAnexo: (id: string, anexoId: string) => apiDownload(`/custos/${id}/anexos/${anexoId}/download`),
  removerAnexo: (id: string, anexoId: string) => apiDelete(`/custos/${id}/anexos/${anexoId}`),
};
