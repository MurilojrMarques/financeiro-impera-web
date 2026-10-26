import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LogOut, Printer, RefreshCw, Settings } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { sectionFor } from '@/app/navigation';
import { SyncStatus } from '@/components/cards/SyncStatus';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useFilters } from '@/hooks/useFilters';
import { formatRange } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { BrandMark } from './BrandMark';
import { ModuleSwitch } from './ModuleSwitch';

const initials = (nome: string | undefined) =>
  (nome ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

/**
 * Cabeçalho. Desktop: marca, "Financeiro" + "Seção — período", status da sincronização e ações (rola junto com a página;
 * as abas é que ficam fixas). Celular: barra compacta e FIXA no topo — a seção atual como título, o status dos dados na
 * 2ª linha e só as ações essenciais. O status é UM elemento só, reposicionado pela grade.
 */
export function DashboardHeader() {
  const { user, logout } = useAuth();
  const { range } = useFilters();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetching = useIsFetching();

  const section = sectionFor(pathname);
  const mostrarPeriodo = !pathname.startsWith('/configuracoes') && !pathname.startsWith('/integracoes');

  return (
    <header className="no-print border-b border-border bg-background/90 backdrop-blur-md max-md:sticky max-md:top-0 max-md:z-40 max-md:pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto grid max-w-[1600px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:gap-x-4 md:py-3.5">
        <BrandMark className="row-span-2 size-11 md:row-span-1 md:size-14" />

        <div className="col-start-2 min-w-0">
          {/* o h1 é a SEÇÃO (título da página); no desktop a marca "Financeiro" vem acima, como texto comum */}
          <p className="hidden text-xl font-semibold leading-tight md:block">Financeiro</p>
          <h1 className="truncate text-[15px] font-semibold leading-tight md:text-[13px] md:font-normal md:text-muted-foreground" data-testid="header-subtitle">
            {section}
            {mostrarPeriodo && <span className="hidden md:inline"> — {formatRange(range)}</span>}
          </h1>
        </div>

        <SyncStatus className="col-start-2 row-start-2 md:col-start-3 md:row-start-1" />

        <div className="col-start-3 row-span-2 row-start-1 flex items-center gap-1.5 md:col-start-4 md:row-span-1 md:gap-2">
          <ModuleSwitch className="max-md:hidden" />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void queryClient.invalidateQueries()}
            aria-label="Atualizar dados desta tela"
            disabled={fetching > 0}
            className="max-lg:size-9 max-lg:px-0 max-lg:pointer-coarse:size-11"
          >
            <RefreshCw className={cn(fetching > 0 && 'animate-spin')} /> <span className="hidden lg:inline">Atualizar</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()} aria-label="Salvar em PDF ou imprimir" className="hidden lg:inline-flex">
            <Printer /> Salvar em PDF
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" aria-label="Menu do usuário" className="max-lg:size-9 max-lg:rounded-full max-lg:px-0 max-lg:pointer-coarse:size-11">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary" aria-hidden="true">
                  {initials(user?.nome)}
                </span>
                <span className="hidden max-w-32 truncate lg:inline">{user?.nome}</span> <ChevronDown className="hidden lg:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">{user?.nome}</span>
                <span className="block truncate">{user?.email ?? user?.usuario}</span>
                <span className="block text-[11px]">Perfil: {user?.perfil}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/configuracoes"><Settings /> Configurações</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="lg:hidden" onSelect={() => window.print()}>
                <Printer /> Salvar em PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  void logout().then(() => navigate('/login', { replace: true }));
                }}
              >
                <LogOut /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
