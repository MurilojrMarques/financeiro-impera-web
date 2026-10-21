import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useNavItems } from '@/hooks/useNavItems';
import { useScrollEdges } from '@/hooks/useScrollEdges';
import { cn } from '@/lib/utils';

/**
 * Abas horizontais (uma por rota), fixas no topo ao rolar a página. Só aparecem a partir de `md`: no celular a
 * navegação é a barra inferior (MobileNav). Se não couberem, a lista rola; as bordas esmaecem onde há mais itens e a
 * aba ativa é trazida para o centro.
 */
export function DashboardNavigation() {
  const { items } = useNavItems();
  const { pathname } = useLocation();
  const { ref, onScroll } = useScrollEdges<HTMLUListElement>([pathname, items.length]);

  useEffect(() => {
    const el = ref.current;
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && active) el.scrollTo({ left: active.offsetLeft - (el.clientWidth - active.clientWidth) / 2, behavior: 'smooth' });
  }, [pathname, items.length, ref]);

  return (
    <nav aria-label="Seções do financeiro" className="no-print sticky top-0 z-30 hidden border-b border-border bg-background/90 backdrop-blur-md md:block">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
        <ul ref={ref} onScroll={onScroll} className="thin-scrollbar fade-edges-x -mx-3 flex gap-0.5 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <li key={item.to} className="shrink-0">
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'relative block whitespace-nowrap px-3 py-3.5 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
