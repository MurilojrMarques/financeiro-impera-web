import { createContext } from 'react';
import type { Usuario } from '@/types/auth.types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: Usuario | null;
  /** true quando a sessão acabou de expirar (mostra a tela de sessão expirada em vez do login "limpo") */
  sessionExpired: boolean;
  login: (login: string, senha: string) => Promise<Usuario>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  /** após trocar a senha obrigatória */
  markPasswordChanged: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
