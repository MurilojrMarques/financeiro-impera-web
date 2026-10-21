import { useMemo } from 'react';
import { can, canAccess, type Action, type Area } from '@/lib/permissions';
import { useAuth } from './useAuth';

/** A UI oculta o que o perfil não pode usar; o backend continua sendo a autoridade final (403). */
export function usePermissions() {
  const { user } = useAuth();
  return useMemo(
    () => ({
      perfil: user?.perfil,
      canAccess: (area: Area) => canAccess(user?.perfil, area),
      can: (action: Action) => can(user?.perfil, action),
    }),
    [user?.perfil],
  );
}
