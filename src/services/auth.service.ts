import type { Result } from '@/types/api.types';
import type { AuthPayload, Sessao, Usuario } from '@/types/auth.types';
import { apiDelete, apiGet, apiNoContent, apiPost, refreshSession, tokenStore } from './api.client';

export async function login(email: string, senha: string): Promise<AuthPayload> {
  const { data } = await apiPost<AuthPayload>('/auth/login', { email, senha });
  tokenStore.set(data.accessToken);
  return data;
}

/** Recupera a sessão ao recarregar a página: usa o cookie HttpOnly do refresh token (JS nunca o enxerga). */
export async function restoreSession(): Promise<AuthPayload | null> {
  return refreshSession();
}

export async function logout(): Promise<void> {
  try {
    await apiNoContent('post', '/auth/logout', {});
  } finally {
    tokenStore.set(null);
  }
}

export async function logoutAll(): Promise<void> {
  try {
    await apiNoContent('post', '/auth/logout-all');
  } finally {
    tokenStore.set(null);
  }
}

export const me = (signal?: AbortSignal): Promise<Result<Usuario>> => apiGet<Usuario>('/auth/me', { signal });

export const changePassword = (senhaAtual: string, novaSenha: string): Promise<void> =>
  apiNoContent('patch', '/auth/change-password', { senhaAtual, novaSenha });

export const sessions = (signal?: AbortSignal): Promise<Result<Sessao[]>> => apiGet<Sessao[]>('/auth/sessions', { signal });

export const revokeSession = (id: string): Promise<void> => apiDelete(`/auth/sessions/${id}`);

/** Recursos de conta do servidor (ex.: se a recuperação por e-mail está configurada). */
export const authConfig = (signal?: AbortSignal): Promise<Result<{ recuperacaoSenha: boolean }>> => apiGet('/auth/config', { signal });

/** Resposta sempre igual, exista ou não a conta (a API não revela cadastros). */
export const forgotPassword = (email: string): Promise<unknown> => apiPost('/auth/forgot-password', { email });

export const validarLink = async (token: string): Promise<{ valido: boolean; tipo: 'RESET_SENHA' | 'CONVITE' | null }> =>
  (await apiPost<{ valido: boolean; tipo: 'RESET_SENHA' | 'CONVITE' | null }>('/auth/link/validar', { token })).data;

export const resetPassword = (token: string, novaSenha: string): Promise<void> => apiNoContent('post', '/auth/reset-password', { token, novaSenha });
export const activateAccount = (token: string, novaSenha: string): Promise<void> => apiNoContent('post', '/auth/activate', { token, novaSenha });
