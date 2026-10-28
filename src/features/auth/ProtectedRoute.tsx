import { LoaderCircle } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { NoPermissionState } from '@/components/feedback/NoPermissionState';
import { useAuth } from '@/hooks/useAuth';
import type { Area } from '@/lib/permissions';
import { usePermissions } from '@/hooks/usePermissions';

/** Exige sessão válida. Sem sessão => login (guardando o destino); senha temporária => troca obrigatória. */
export function ProtectedRoute() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div role="status" aria-label="Verificando sessão" className="flex min-h-dvh items-center justify-center bg-background">
        <LoaderCircle className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (status === 'unauthenticated' || !user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login${next && next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} replace />;
  }
  if (user.trocaSenhaObrigatoria) return <Navigate to="/trocar-senha" replace />;
  return <Outlet />;
}

/** Controle de acesso por área/perfil (a UI oculta; o backend continua sendo a autoridade). */
export function RequireArea({ area, children }: { area: Area; children: React.ReactNode }) {
  const { canAccess, temFinanceiro, temRh } = usePermissions();
  if (canAccess(area)) return <>{children}</>;
  // colaborador (só RH) que cai numa tela do financeiro, por link antigo ou favorito, vai para o RH em vez de ver "acesso negado"
  if (!temFinanceiro && temRh) return <Navigate to="/rh" replace />;
  return <NoPermissionState />;
}
