export type Perfil = 'ADMIN' | 'FINANCEIRO' | 'ANALISTA' | 'LEITURA';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
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
  email: string;
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
