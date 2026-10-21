import { apiDelete, apiGet, apiPost } from './api.client';
import type { Params } from '@/lib/query-keys';
import type {
  AfiliadoAlias, AfiliadoCadastro, AfiliadoComissoes, AfiliadoItem, AfiliadoRanking, AfiliadoResumo,
  DimRow, MetricasFormatadas, RegraComissaoAfiliado, SerieRow, VendaItem,
} from '@/types/financial.types';
import { getter, pagedGetter } from './report.helpers';

export interface NovaRegraComissao {
  valorFixoCentavos?: number;
  percentualBps?: number;
  vigenteDe: string; // ISO com offset
  vigenteAte?: string;
  fonte: string;
  observacao?: string;
}

export const afiliadosService = {
  listar: pagedGetter<AfiliadoItem>('/afiliados'),
  resumo: getter<AfiliadoResumo>('/afiliados/resumo'),
  ranking: getter<AfiliadoRanking[]>('/afiliados/ranking'),
  evolucao: getter<SerieRow[]>('/afiliados/evolucao'),
  porLoja: getter<DimRow[]>('/afiliados/por-loja'),

  detalhe: (id: string, signal?: AbortSignal) => apiGet<AfiliadoCadastro>(`/afiliados/${id}`, { signal }),
  resumoDoAfiliado: (id: string, params?: Params, signal?: AbortSignal) => apiGet<MetricasFormatadas & { reembolsosCentavos: number }>(`/afiliados/${id}/resumo`, { params, signal }),
  vendas: (id: string, params?: Params, signal?: AbortSignal) => pagedGetter<VendaItem>(`/afiliados/${id}/vendas`)(params, signal),
  comissoes: (id: string, params?: Params, signal?: AbortSignal) => apiGet<AfiliadoComissoes>(`/afiliados/${id}/comissoes`, { params, signal }),
  reembolsos: (id: string, params?: Params, signal?: AbortSignal) => pagedGetter<VendaItem>(`/afiliados/${id}/reembolsos`)(params, signal),
  evolucaoDoAfiliado: (id: string, params?: Params, signal?: AbortSignal) => apiGet<SerieRow[]>(`/afiliados/${id}/evolucao`, { params, signal }),

  aliases: (id: string, signal?: AbortSignal) => apiGet<AfiliadoAlias[]>(`/afiliados/${id}/aliases`, { signal }),
  criarAlias: (id: string, alias: string) =>
    apiPost<{ alias: AfiliadoAlias; afiliadoIncorporado: string | null; vendasMovidas: number }>(`/afiliados/${id}/aliases`, { alias }),
  removerAlias: (id: string, aliasId: string) => apiDelete(`/afiliados/${id}/aliases/${aliasId}`),

  regrasComissao: (id: string, signal?: AbortSignal) => apiGet<RegraComissaoAfiliado[]>(`/afiliados/${id}/regras-comissao`, { signal }),
  criarRegraComissao: (id: string, regra: NovaRegraComissao) =>
    apiPost<{ regra: RegraComissaoAfiliado; vendasRecalculadas: number }>(`/afiliados/${id}/regras-comissao`, regra),
};
