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
  /** com e-mail e sem senha: convite por e-mail. Sem e-mail, a senha inicial é obrigatória */
  criarUsuario: (u: { nome: string; email?: string; usuario?: string; perfil: Perfil; senhaTemporaria?: string }) => apiPost<UsuarioAdmin & { conviteEnviado: boolean }>('/usuarios', u),
  reenviarConvite: (id: string) => apiPost<{ enviado: boolean }>(`/usuarios/${id}/reenviar-convite`),
  enviarRedefinicao: (id: string) => apiPost<{ enviado: boolean }>(`/usuarios/${id}/redefinir-senha`),
  desbloquearUsuario: (id: string) => apiPost<UsuarioAdmin>(`/usuarios/${id}/desbloquear`),
  atualizarStatus: (id: string, ativo: boolean) => apiPatch<UsuarioAdmin>(`/usuarios/${id}/status`, { ativo }),
  atualizarPerfil: (id: string, perfil: Perfil) => apiPatch<UsuarioAdmin>(`/usuarios/${id}/perfil`, { perfil }),

  auditoria: pagedGetter<AuditoriaItem>('/admin/auditoria'),

  regrasClassificacao: (signal?: AbortSignal) => apiGet<RegraClassificacao[]>('/classificacoes/regras', { signal }),
  criarRegraClassificacao: (r: NovaRegraClassificacao) => apiPost<RegraClassificacao>('/classificacoes/regras', r),
  removerRegraClassificacao: (id: string) => apiDelete(`/classificacoes/regras/${id}`),
  pendencias: (params?: Params, signal?: AbortSignal) => apiGet<Pendencias>('/classificacoes/pendencias', { params, signal }),
};
