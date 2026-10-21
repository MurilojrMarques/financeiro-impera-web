import { lazy, type ComponentType } from 'react';
import { createBrowserRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute, RequireArea } from '@/features/auth/ProtectedRoute';
import type { Area } from '@/lib/permissions';

// Code splitting por rota: cada página (e os gráficos) só é baixada quando acessada.
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const ForcedPasswordChangePage = lazy(() => import('@/features/auth/ForcedPasswordChangePage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const FrontPage = lazy(() => import('@/features/front/FrontPage'));
const BackendPage = lazy(() => import('@/features/backend/BackendPage'));
const CallCenterPage = lazy(() => import('@/features/call-center/CallCenterPage'));
const RecuperacaoPage = lazy(() => import('@/features/recuperacao/RecuperacaoPage'));
const AfiliadosPage = lazy(() => import('@/features/afiliados/AfiliadosPage'));
const AfiliadoDetalhePage = lazy(() => import('@/features/afiliados/AfiliadoDetalhePage'));
const CustosFixosPage = lazy(() => import('@/features/custos/CustosFixosPage'));
const CustosCallCenterPage = lazy(() => import('@/features/custos/CustosCallCenterPage'));
const ReembolsosPage = lazy(() => import('@/features/reembolsos/ReembolsosPage'));
const CampanhasPage = lazy(() => import('@/features/campanhas/CampanhasPage'));
const IntegracoesPage = lazy(() => import('@/features/integracoes/IntegracoesPage'));
const ConfiguracoesPage = lazy(() => import('@/features/configuracoes/ConfiguracoesPage'));
const NotFoundPage = lazy(() => import('@/features/NotFoundPage'));

const guarded = (path: string, area: Area, Page: ComponentType): RouteObject => ({
  path,
  element: (
    <RequireArea area={area}>
      <Page />
    </RequireArea>
  ),
});

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/trocar-senha', element: <ForcedPasswordChangePage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          guarded('/dashboard', 'dashboard', DashboardPage),
          guarded('/front', 'front', FrontPage),
          guarded('/backend', 'backend', BackendPage),
          guarded('/call-center', 'call-center', CallCenterPage),
          guarded('/recuperacao', 'recuperacao', RecuperacaoPage),
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
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
export const createTestRouter = (initialEntries: string[]) => createMemoryRouter(routes, { initialEntries });
