import type {
  RhAlteracao, RhColaborador, RhDocumento, RhDocumentoEnvio, RhEu, RhFolhaDetalhe, RhFolhaItem, RhFolhaItemEdicao, RhFolhaListada,
  RhMonitoramento, RhMovimentacao, RhNotasResumo, RhPainel, RhResultadoSync, RhStatusDocumento,
} from '@/types/rh.types';
import { apiDownload, apiGet, apiPatch, apiPost, apiUploadForm } from './api.client';
import { pagedGetter } from './report.helpers';

/**
 * RH. Salário, cargo e promoção NASCEM no sistema do RH (Alexandre): aqui só há consulta. O que se grava neste sistema é a folha
 * (comissão, bônus, desconto, pagamento) e os documentos (NF e comprovantes).
 */
export const rhService = {
  eu: (signal?: AbortSignal) => apiGet<RhEu>('/rh/colaboradores/eu', { signal }),
  painel: (signal?: AbortSignal) => apiGet<RhPainel>('/rh/colaboradores/painel', { signal }),
  colaboradores: pagedGetter<RhColaborador>('/rh/colaboradores'),
  colaborador: (id: string, signal?: AbortSignal) => apiGet<RhColaborador>(`/rh/colaboradores/${id}`, { signal }),
  movimentacoes: (id: string, signal?: AbortSignal) => apiGet<RhMovimentacao[]>(`/rh/colaboradores/${id}/movimentacoes`, { signal }),
  /** foto protegida (exige login): devolve um Blob para exibir */
  foto: (id: string) => apiDownload(`/rh/colaboradores/${id}/foto`),

  folhas: (signal?: AbortSignal) => apiGet<RhFolhaListada[]>('/rh/folha', { signal }),
  folha: (competencia: string, signal?: AbortSignal) => apiGet<RhFolhaDetalhe>(`/rh/folha/${competencia}`, { signal }),
  gerarFolha: (competencia: string, recalcular = false) =>
    apiPost<{ competencia: string; incluidos: number; recalculados: number; pessoas: number }>(`/rh/folha/${competencia}/gerar${recalcular ? '?recalcular=true' : ''}`),
  editarItem: (competencia: string, itemId: string, dados: RhFolhaItemEdicao) => apiPatch<RhFolhaItem>(`/rh/folha/${competencia}/itens/${itemId}`, dados),
  fecharFolha: (competencia: string) => apiPost<{ competencia: string; status: string }>(`/rh/folha/${competencia}/fechar`),

  documentos: pagedGetter<RhDocumento>('/rh/documentos'),
  notasResumo: (competencia: string, signal?: AbortSignal) => apiGet<RhNotasResumo>('/rh/documentos/resumo', { params: { competencia }, signal }),
  enviarDocumento: (arquivo: File, dados: RhDocumentoEnvio) =>
    apiUploadForm<RhDocumento>('/rh/documentos', 'arquivo', arquivo, { ...dados }),
  baixarDocumento: (id: string) => apiDownload(`/rh/documentos/${id}/arquivo`),
  revisarDocumento: (id: string, status: Exclude<RhStatusDocumento, 'ENVIADO'>, motivo?: string) =>
    apiPatch<{ id: string; status: RhStatusDocumento }>(`/rh/documentos/${id}/status`, { status, ...(motivo ? { motivo } : {}) }),

  monitoramento: (signal?: AbortSignal) => apiGet<RhMonitoramento>('/rh/monitoramento', { signal }),
  alteracoes: pagedGetter<RhAlteracao>('/rh/alteracoes'),
  conferirAgora: (forcar = false) => apiPost<RhResultadoSync>(`/rh/sincronizar${forcar ? '?forcar=true' : ''}`),
};
