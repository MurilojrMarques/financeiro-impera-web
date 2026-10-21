import { ChevronRight, Ellipsis } from 'lucide-react';
import { useState } from 'react';
import { NavLink, matchPath, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavItems } from '@/hooks/useNavItems';
import { cn } from '@/lib/utils';

/** Máximo de destinos na barra (o último vira "Mais" quando há mais seções que isso). */
const MAX_SLOTS = 5;

const tab = (active: boolean) =>
  cn(
    'flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 pb-1.5 pt-2 text-[11px] font-medium leading-tight transition-colors',
    active ? 'text-primary' : 'text-muted-foreground active:text-foreground',
  );

/**
 * Navegação do celular: barra fixa na base (alcance do polegar) com as primeiras seções e "Mais" para o resto.
 * Respeita a área segura do aparelho. Some a partir de `md`, onde as abas ficam no topo.
 */
export function MobileNav() {
  const { items, settings } = useNavItems();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // "Mais" ocupa um dos slots e sempre existe (leva Configurações); as seções que não couberem vão para ele
  const primary = items.length >= MAX_SLOTS ? items.slice(0, MAX_SLOTS - 1) : items;
  const rest = items.slice(primary.length);
  const onPath = (to: string) => !!matchPath({ path: to, end: false }, pathname);
  const restActive = rest.some((i) => onPath(i.to)) || onPath(settings.to);

  return (
    <>
      <nav aria-label="Navegação principal" className="no-print pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.6)] backdrop-blur-md md:hidden">
        <ul className="mx-auto flex max-w-xl">
          {primary.map((item) => (
            <li key={item.to} className="min-w-0 flex-1">
              <NavLink to={item.href} className={({ isActive }) => tab(isActive)}>
                {({ isActive }) => (
                  <>
                    <item.icon className={cn('size-5 transition-transform', isActive && 'scale-110')} aria-hidden="true" />
                    <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li className="min-w-0 flex-1">
            <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className={tab(restActive)}>
              <Ellipsis className="size-5" aria-hidden="true" />
              <span>Mais</span>
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Todas as seções</DialogTitle>
            <DialogDescription className="sr-only">Escolha uma seção para abrir</DialogDescription>
          </DialogHeader>
          <ul className="-mx-2 grid grid-cols-1 gap-0.5">
            {[...rest, { ...settings, shortLabel: undefined }].map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn('flex min-h-12 items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors active:bg-surface', isActive ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-surface')
                  }
                >
                  <item.icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </NavLink>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
