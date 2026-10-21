import { expect, test, type Page } from '@playwright/test';
import { layoutProblems, settle } from './support/layout';
import { installMockApi } from './support/mock-api';

/**
 * Regressão de layout/responsividade com API falsa (não precisa de backend nem de credenciais).
 * Para cada largura (320 a 1640 px) e rota garante: nenhuma rolagem horizontal da página, nenhum valor de KPI cortado e nenhuma chamada sem mock.
 *
 *   npx playwright test responsive
 *   SHOTS=1 npx playwright test responsive            # também grava capturas em test-results/shots/<largura>/ (ou em $SHOTS_DIR)
 *   SHOT_VP=celular SHOT_ROUTE=/front SHOTS=1 npx playwright test responsive -g "front"
 */
const VIEWPORTS = [
  { name: 'celular-minimo', width: 320, height: 568, touch: true }, // iPhone SE (1ª geração)
  { name: 'celular-pequeno', width: 360, height: 740, touch: true },
  { name: 'celular', width: 390, height: 844, touch: true },
  { name: 'tablet', width: 768, height: 1024, touch: true },
  { name: 'notebook', width: 1280, height: 800, touch: false },
  { name: 'desktop', width: 1640, height: 900, touch: false },
] as const;

const ROUTES = [
  '/dashboard', '/front', '/backend', '/call-center', '/afiliados', '/afiliados/aff-1', '/custos/fixos', '/custos/call-center',
  '/reembolsos', '/campanhas', '/integracoes', '/configuracoes',
] as const;

const only = (env: string | undefined) => (env ? env.split(',').map((s) => s.trim().replace(/^\//, '')).filter(Boolean) : null);
const onlyVp = only(process.env.SHOT_VP);
/** aceita `front,dashboard` ou `/front,/dashboard` (no Git Bash a barra inicial é reescrita como caminho do Windows) */
const onlyRoute = only(process.env.SHOT_ROUTE);
const SHOTS_DIR = process.env.SHOTS_DIR ?? 'test-results/shots';
const SCALES = process.env.SHOT_SCALE ? [Number(process.env.SHOT_SCALE)] : [1, 10];

async function shoot(page: Page, vp: (typeof VIEWPORTS)[number], route: string) {
  const full = await page.evaluate(() => document.documentElement.scrollHeight);
  const chunk = vp.width < 800 ? 1500 : 2200;
  const name = route.replace(/^\//, '').replace(/\//g, '-') || 'home';
  for (let y = 0, i = 1; y < full; y += chunk, i++) {
    await page.screenshot({ path: `${SHOTS_DIR}/${vp.name}/${name}-${i}.png`, fullPage: true, clip: { x: 0, y, width: vp.width, height: Math.min(chunk, full - y) } });
  }
}

for (const vp of VIEWPORTS) {
  if (onlyVp && !onlyVp.includes(vp.name)) continue;
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch, deviceScaleFactor: vp.touch ? 2 : 1 });

    if (!onlyRoute || onlyRoute.includes('login')) {
      test(`${vp.name} /login (sem sessão)`, async ({ page }) => {
        const api = await installMockApi(page, { unauthenticated: true });
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
        if (process.env.SHOTS === '1') await shoot(page, vp, '/login');
        expect(await layoutProblems(page), 'problemas de layout').toEqual([]);
        expect(api.unhandled, 'endpoints sem mock').toEqual([]);
      });
    }

    for (const route of ROUTES) {
      if (onlyRoute && !onlyRoute.includes(route.replace(/^\//, ''))) continue;
      for (const scale of SCALES) {
        test(`${vp.name} ${route}${scale > 1 ? ' (valores 10×)' : ''}`, async ({ page }) => {
          const erros: string[] = [];
          page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
          page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
          const api = await installMockApi(page, { scale });
          await page.goto(route);
          await settle(page);
          if (process.env.SHOTS === '1' && scale === SCALES[0]) await shoot(page, vp, route);
          expect(await layoutProblems(page), 'problemas de layout').toEqual([]);
          expect(api.unhandled, 'endpoints sem mock').toEqual([]);
          // avisos do React (validateDOMNesting, chaves duplicadas...) e erros de execução não podem aparecer
          expect(erros.filter((e) => !/favicon|ResizeObserver/.test(e)), 'erros de console').toEqual([]);
        });
      }
    }
  });
}
