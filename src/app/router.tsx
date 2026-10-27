import { lazy, type ComponentType } from 'react';
import { createBrowserRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom';
import { RouteError } from '@/components/feedback/RouteError';
import { RhLayout } from '@/components/layout/RhLayout';
import { HomeRedirect, RequireRh } from '@/features/rh/RhRoutes';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute, RequireArea } from '@/features/auth/ProtectedRoute';
import type { Area, RhArea } from '@/lib/permissions';

// Code splitting por rota: cada página (e os gráficos) só é baixada quando acessada.
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));
const ActivateAccountPage = lazy(() => import('@/features/auth/ActivateAccountPage'));
const ForcedPasswordChangePage = lazy(() => import('@/features/auth/ForcedPasswordChangePage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const FrontPage = lazy(() => import('@/features/front/FrontPage'));
const BackendPage = lazy(() => import('@/features/backend/BackendPage'));
const CallCenterPage = lazy(() => import('@/features/call-center/CallCenterPage'));
const RecuperacaoPage = lazy(() => import('@/features/recuperacao/RecuperacaoPage'));
const ComissoesPage = lazy(() => import('@/features/comissoes/ComissoesPage'));
const AfiliadosPage = lazy(() => import('@/features/afiliados/AfiliadosPage'));
const AfiliadoDetalhePage = lazy(() => import('@/features/afiliados/AfiliadoDetalhePage'));
const CustosFixosPage = lazy(() => import('@/features/custos/CustosFixosPage'));
const CustosCallCenterPage = lazy(() => import('@/features/custos/CustosCallCenterPage'));
const ReembolsosPage = lazy(() => import('@/features/reembolsos/ReembolsosPage'));
const CampanhasPage = lazy(() => import('@/features/campanhas/CampanhasPage'));
const IntegracoesPage = lazy(() => import('@/features/integracoes/IntegracoesPage'));
const ConfiguracoesPage = lazy(() => import('@/features/configuracoes/ConfiguracoesPage'));
const NotFoundPage = lazy(() => import('@/features/NotFoundPage'));
const RhPainelPage = lazy(() => import('@/features/rh/PainelPage'));
const RhColaboradoresPage = lazy(() => import('@/features/rh/ColaboradoresPage'));
const RhColaboradorDetalhePage = lazy(() => import('@/features/rh/ColaboradorDetalhePage'));
const RhMeuPerfilPage = lazy(() => import('@/features/rh/ColaboradorDetalhePage').then((m) => ({ default: m.MeuPerfilPage })));
const RhFolhaPage = lazy(() => import('@/features/rh/FolhaPage'));
const RhFolhaDetalhePage = lazy(() => import('@/features/rh/FolhaDetalhePage'));
const RhComissoesPage = lazy(() => import('@/features/rh/ComissoesRhPage'));
const RhDocumentosPage = lazy(() => import('@/features/rh/DocumentosPage'));
const RhMonitoramentoPage = lazy(() => import('@/features/rh/MonitoramentoPage'));
const RhContaPage = lazy(() => import('@/features/rh/ContaPage'));

const rh = (path: string, area: RhArea, Page: ComponentType): RouteObject => ({
  path,
  element: (
    <RequireRh area={area}>
      <Page />
    </RequireRh>
  ),
});

const guarded = (path: string, area: Area, Page: ComponentType): RouteObject => ({
  path,
  element: (
    <RequireArea area={area}>
      <Page />
    </RequireArea>
  ),
});

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage />, errorElement: <RouteError /> },
  { path: '/esqueci-senha', element: <ForgotPasswordPage /> },
  { path: '/redefinir-senha', element: <ResetPasswordPage /> },
  { path: '/ativar-conta', element: <ActivateAccountPage /> },
  { path: '/trocar-senha', element: <ForcedPasswordChangePage /> },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/', element: <HomeRedirect /> },
          guarded('/dashboard', 'dashboard', DashboardPage),
          guarded('/front', 'front', FrontPage),
          guarded('/backend', 'backend', BackendPage),
          guarded('/call-center', 'call-center', CallCenterPage),
          guarded('/recuperacao', 'recuperacao', RecuperacaoPage),
          guarded('/comissoes', 'comissoes', ComissoesPage),
          guarded('/afiliados', 'afiliados', AfiliadosPage),
          guarded('/afiliados/:id', 'afiliados', AfiliadoDetalhePage),
          guarded('/custos', 'custos', () => <Navigate to="/custos/fixos" replace />),
          guarded('/custos/fixos', 'custos', CustosFixosPage),
          guarded('/custos/call-center', 'custos', CustosCallCenterPage),
          guarded('/reembolsos', 'reembolsos', ReembolsosPage),
          guarded('/campanhas', 'campanhas', CampanhasPage),
          guarded('/integracoes', 'integracoes', IntegracoesPage),
          guarded('/configuracoes', 'configuracoes', ConfiguracoesPage),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        path: '/rh',
        element: <RhLayout />,
        children: [
          { index: true, element: <HomeRedirect modulo="rh" /> },
          rh('painel', 'painel', RhPainelPage),
          rh('colaboradores', 'colaboradores', RhColaboradoresPage),
          rh('colaboradores/:id', 'colaboradores', RhColaboradorDetalhePage),
          rh('meu-perfil', 'meu-perfil', RhMeuPerfilPage),
          rh('folha', 'folha', RhFolhaPage),
          rh('folha/:competencia', 'folha', RhFolhaDetalhePage),
          rh('comissoes', 'comissoes', RhComissoesPage),
          rh('documentos', 'documentos', RhDocumentosPage),
          rh('monitoramento', 'monitoramento', RhMonitoramentoPage),
          rh('conta', 'conta', RhContaPage),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
export const createTestRouter = (initialEntries: string[]) => createMemoryRouter(routes, { initialEntries });
