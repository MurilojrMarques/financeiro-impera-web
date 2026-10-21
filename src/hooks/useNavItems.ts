import { useMemo } from 'react';
import { useLocation, type To } from 'react-router-dom';
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from '@/app/navigation';
import { SHARED_PARAMS } from '@/hooks/useFilters';
import { usePermissions } from '@/hooks/usePermissions';

export interface NavLinkItem extends NavItem {
  href: To;
}

/**
 * Seções que o perfil pode abrir, já com o destino (período, comparação e critério acompanham o usuário entre as abas;
 * filtros específicos de página não). Usado pelas abas do desktop e pela barra inferior do celular.
 */
export function useNavItems() {
  const { canAccess } = usePermissions();
  const { search } = useLocation();

  return useMemo(() => {
    const current = new URLSearchParams(search);
    const carry = new URLSearchParams();
    for (const k of SHARED_PARAMS) {
      const v = current.get(k);
      if (v) carry.set(k, v);
    }
    const qs = carry.toString();
    const search2 = qs ? `?${qs}` : '';
    const items: NavLinkItem[] = NAV_ITEMS.filter((i) => canAccess(i.area)).map((i) => ({ ...i, href: { pathname: i.to, search: search2 } }));
    const settings = { ...SETTINGS_ITEM, href: { pathname: SETTINGS_ITEM.to, search: search2 } as To };
    return { items, settings };
  }, [canAccess, search]);
}
