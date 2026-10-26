import { useMemo } from 'react';
import { can, canAccess, rhArea, rhCan, temFinanceiro, type Action, type Area, type RhAction, type RhArea } from '@/lib/permissions';
import { useAuth } from './useAuth';

/** A UI oculta o que o perfil não pode usar; o backend continua sendo a autoridade final (403). */
export function usePermissions() {
  const { user } = useAuth();
  return useMemo(
    () => ({
      perfil: user?.perfil,
      rhPapel: user?.rhPapel ?? null,
      temFinanceiro: temFinanceiro(user?.perfil),
      temRh: !!user?.rhPapel,
      rhArea: (area: RhArea) => rhArea(user?.rhPapel, area),
      rhCan: (action: RhAction) => rhCan(user?.rhPapel, action),
      canAccess: (area: Area) => canAccess(user?.perfil, area),
      can: (action: Action) => can(user?.perfil, action),
    }),
    [user?.perfil, user?.rhPapel],
  );
}
