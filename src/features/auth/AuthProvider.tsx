import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onSessionEvent } from '@/services/api.client';
import * as authService from '@/services/auth.service';
import type { Usuario } from '@/types/auth.types';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<Usuario | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Recupera a sessão ao carregar (cookie HttpOnly do refresh token; o JS nunca vê o token).
  useEffect(() => {
    let cancelado = false;
    authService.restoreSession().then((payload) => {
      if (cancelado) return;
      setUser(payload?.usuario ?? null);
      setStatus(payload ? 'authenticated' : 'unauthenticated');
    });
    return () => {
      cancelado = true;
    };
  }, []);

  // Eventos vindos do cliente HTTP (refresh falhou / troca de senha obrigatória).
  useEffect(
    () =>
      onSessionEvent((e) => {
        if (e === 'expired') {
          queryClient.clear();
          setUser(null);
          setSessionExpired(true);
          setStatus('unauthenticated');
        } else {
          setUser((u) => (u ? { ...u, trocaSenhaObrigatoria: true } : u));
        }
      }),
    [queryClient],
  );

  const login = useCallback(async (email: string, senha: string) => {
    const payload = await authService.login(email, senha);
    setSessionExpired(false);
    setUser(payload.usuario);
    setStatus('authenticated');
    return payload.usuario;
  }, []);

  const clearSession = useCallback(() => {
    queryClient.clear(); // nenhum dado financeiro de sessão anterior permanece em cache
    setUser(null);
    setSessionExpired(false);
    setStatus('unauthenticated');
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const logoutAll = useCallback(async () => {
    try {
      await authService.logoutAll();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const markPasswordChanged = useCallback(() => setUser((u) => (u ? { ...u, trocaSenhaObrigatoria: false } : u)), []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, sessionExpired, login, logout, logoutAll, markPasswordChanged }),
    [status, user, sessionExpired, login, logout, logoutAll, markPasswordChanged],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
