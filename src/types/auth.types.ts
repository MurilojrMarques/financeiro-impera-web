/** SEM_FINANCEIRO: colaborador comum, sem nenhuma tela do financeiro (só o módulo de RH). */
export type Perfil = 'ADMIN' | 'FINANCEIRO' | 'ANALISTA' | 'LEITURA' | 'SEM_FINANCEIRO';

/** Papel no módulo de RH, independente do perfil financeiro (uma pessoa pode ser FINANCEIRO e RH ao mesmo tempo). */
export type RhPapel = 'RH' | 'CEO' | 'GESTOR' | 'COLABORADOR';

export interface Usuario {
  id: string;
  nome: string;
  email: string | null;
  usuario: string | null;
  perfil: Perfil;
  rhPapel: RhPapel | null;
  /** cadastro de RH ao qual este login pertence */
  colaboradorId: string | null;
  trocaSenhaObrigatoria: boolean;
}

export interface AuthPayload {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  usuario: Usuario;
}

export interface Sessao {
  id: string;
  ip: string | null;
  userAgent: string | null;
  criadoEm: string;
  ultimoUsoEm: string;
  expiraEm: string;
  atual: boolean;
}

export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string | null;
  usuario: string | null;
  perfil: Perfil;
  ativo: boolean;
  trocaSenhaObrig: boolean;
  /** convite enviado e ainda não aceito */
  convitePendente: boolean;
  /** bloqueio temporário por tentativas de login (ISO), se vigente */
  bloqueadoAte: string | null;
  senhaAlteradaEm: string | null;
  ultimoLoginEm: string | null;
  criadoEm: string;
}
