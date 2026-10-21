import { Suspense, useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { sectionFor } from '@/app/navigation';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { DashboardHeader } from './DashboardHeader';
import { DashboardNavigation } from './DashboardNavigation';
import { MobileNav } from './MobileNav';
import { PrintHeader } from './PrintHeader';
import { ResponsiveContainer } from './ResponsiveContainer';

export function DashboardLayout() {
  const { pathname } = useLocation();

  // a aba do navegador e o histórico dizem em que seção o usuário está (e leitores de tela anunciam a troca de página)
  useEffect(() => {
    document.title = `${sectionFor(pathname)} · Financeiro`;
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-background">
      <a href="#conteudo" className="no-print sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Ir para o conteúdo
      </a>
      <OfflineBanner />
      <DashboardHeader />
      <DashboardNavigation />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        {/* no celular o rodapé reserva espaço para a barra de navegação fixa + área segura */}
        <ResponsiveContainer className="space-y-6 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:py-6 md:pb-12">
          <PrintHeader />
          <Suspense fallback={<LoadingSkeleton variant="page" />}>
            <Outlet />
          </Suspense>
        </ResponsiveContainer>
      </main>
      <MobileNav />
      {/* trocar de seção volta ao topo; mudar filtro/ordenação/página (mesmo caminho) mantém a posição; "voltar" restaura */}
      <ScrollRestoration getKey={(location) => location.pathname} />
    </div>
  );
}
