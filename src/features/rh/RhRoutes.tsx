import { Navigate } from 'react-router-dom';
import { NoPermissionState } from '@/components/feedback/NoPermissionState';
import { usePermissions } from '@/hooks/usePermissions';
import { primeiraAreaRh, type RhArea } from '@/lib/permissions';

/** Controle de acesso do RH por papel (a UI oculta; a API continua sendo a autoridade). */
export function RequireRh({ area, children }: { area: RhArea; children: React.ReactNode }) {
  const { rhArea } = usePermissions();
  return rhArea(area) ? <>{children}</> : <NoPermissionState />;
}

/**
 * Página inicial: quem tem financeiro vai para a visão executiva; quem só tem RH vai para a primeira tela do seu papel.
 * Com `modulo="rh"` (a raiz /rh) vai sempre para o RH.
 */
export function HomeRedirect({ modulo }: { modulo?: 'rh' }) {
  const { temFinanceiro, rhPapel } = usePermissions();
  const area = primeiraAreaRh(rhPapel);
  if (modulo !== 'rh' && temFinanceiro) return <Navigate to="/dashboard" replace />;
  if (area) return <Navigate to={`/rh/${area}`} replace />;
  return <NoPermissionState description="Sua conta ainda não tem acesso a nenhum módulo. Fale com o administrador." />;
}
