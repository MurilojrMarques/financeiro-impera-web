import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { Suspense, useEffect } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom';
import { RH_CONTA_ITEM, RH_NAV_ITEMS, rhSectionFor } from '@/app/rh-navigation';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { BrandMark } from './BrandMark';
import { ModuleSwitch } from './ModuleSwitch';
import { ResponsiveContainer } from './ResponsiveContainer';

const initials = (nome: string | undefined) => (nome ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
const PAPEL: Record<string, string> = { RH: 'RH', CEO: 'CEO', GESTOR: 'Gestor', COLABORADOR: 'Colaborador' };

/** Moldura do módulo de RH: cabeçalho, abas (só as do papel) e conteúdo. Não consulta nada do financeiro. */
export function RhLayout() {
  const { user, logout } = useAuth();
  const { rhArea } = usePermissions();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // "Meu perfil" só existe para quem tem cadastro de colaborador (o administrador pode não ter)
  const itens = RH_NAV_ITEMS.filter((i) => rhArea(i.area) && (i.area !== 'meu-perfil' || !!user?.colaboradorId));
  const section = rhSectionFor(pathname);

  useEffect(() => {
    document.title = `${section} · Pessoas`;
  }, [section]);

  return (
    <div className="min-h-dvh bg-background">
      <a href="#conteudo" className="no-print sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Ir para o conteúdo
      </a>
      <OfflineBanner />
      <header className="no-print border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5 sm:px-6 md:py-3.5">
          <BrandMark className="size-10 md:size-12" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold leading-tight md:text-xl">Pessoas</p>
            <h1 className="truncate text-[13px] leading-tight text-muted-foreground" data-testid="header-subtitle">{section}</h1>
          </div>
          <ModuleSwitch className="max-sm:hidden" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" aria-label="Menu do usuário" className="max-lg:size-9 max-lg:rounded-full max-lg:px-0">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary" aria-hidden="true">{initials(user?.nome)}</span>
                <span className="hidden max-w-32 truncate lg:inline">{user?.nome}</span> <ChevronDown className="hidden lg:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">{user?.nome}</span>
                <span className="block truncate">{user?.email ?? user?.usuario}</span>
                <span className="block text-[11px]">{user?.perfil === 'ADMIN' && user.rhPapel === 'CEO' ? 'RH: administrador (consulta tudo; envia só a própria nota)' : `Papel no RH: ${user?.rhPapel ? PAPEL[user.rhPapel] : '—'}`}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={RH_CONTA_ITEM.to}><Settings /> {RH_CONTA_ITEM.label}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { void logout().then(() => navigate('/login', { replace: true })); }}>
                <LogOut /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mx-auto max-w-[1600px] px-4 pb-2 sm:hidden"><ModuleSwitch /></div>
      </header>

      <nav aria-label="Seções do RH" className="no-print sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
          <ul className="thin-scrollbar -mx-3 flex gap-0.5 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {itens.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-1.5 whitespace-nowrap px-3 py-3.5 text-[13px] font-medium transition-colors',
                      isActive ? 'text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary' : 'text-muted-foreground hover:text-foreground',
                    )
                  }
                >
                  <item.icon className="size-4 max-sm:hidden" aria-hidden="true" /> {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <main id="conteudo" tabIndex={-1} className="outline-none">
        <ResponsiveContainer className="space-y-6 py-5 pb-12 sm:py-6">
          <Suspense fallback={<LoadingSkeleton variant="page" />}>
            <Outlet />
          </Suspense>
        </ResponsiveContainer>
      </main>
      <ScrollRestoration getKey={(location) => location.pathname} />
    </div>
  );
}
