import type { Params } from '@/lib/query-keys';
import type { Perfil, UsuarioAdmin } from '@/types/auth.types';
import type { AuditoriaItem, GrupoReceita, Pendencias, RegraClassificacao } from '@/types/financial.types';
import { apiDelete, apiGet, apiPatch, apiPost } from './api.client';
import { pagedGetter } from './report.helpers';

export interface NovaRegraClassificacao {
  nome: string;
  campo: 'ORIGEM' | 'TIPO_ATENDIMENTO' | 'LOJA' | 'CAMPANHA' | 'UTM_SOURCE' | 'SRC' | 'CHECKOUT';
  operador: 'IGUAL' | 'CONTEM' | 'COMECA_COM';
  valor: string;
  grupo: GrupoReceita;
  canal?: string;
  prioridade: number;
  ativa: boolean;
}

export const adminService = {
  usuarios: pagedGetter<UsuarioAdmin>('/usuarios'),
  criarUsuario: (u: { nome: string; email: string; perfil: Perfil; senhaTemporaria: string }) => apiPost<UsuarioAdmin>('/usuarios', u),
  atualizarStatus: (id: string, ativo: boolean) => apiPatch<UsuarioAdmin>(`/usuarios/${id}/status`, { ativo }),
  atualizarPerfil: (id: string, perfil: Perfil) => apiPatch<UsuarioAdmin>(`/usuarios/${id}/perfil`, { perfil }),

  auditoria: pagedGetter<AuditoriaItem>('/admin/auditoria'),

  regrasClassificacao: (signal?: AbortSignal) => apiGet<RegraClassificacao[]>('/classificacoes/regras', { signal }),
  criarRegraClassificacao: (r: NovaRegraClassificacao) => apiPost<RegraClassificacao>('/classificacoes/regras', r),
  removerRegraClassificacao: (id: string) => apiDelete(`/classificacoes/regras/${id}`),
  pendencias: (params?: Params, signal?: AbortSignal) => apiGet<Pendencias>('/classificacoes/pendencias', { params, signal }),
};
