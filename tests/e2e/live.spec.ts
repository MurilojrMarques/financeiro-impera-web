import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Smoke E2E contra a API REAL (sem mocks). Só roda com E2E_LIVE=1 e credenciais no ambiente:
 *   E2E_LIVE=1 E2E_EMAIL=... E2E_PASSWORD=... npx playwright test live
 * A API precisa estar no ar com CORS_ORIGINS incluindo http://localhost:5173.
 */
const live = process.env.E2E_LIVE === '1' && !!process.env.E2E_EMAIL && !!process.env.E2E_PASSWORD;
test.skip(!live, 'defina E2E_LIVE=1, E2E_EMAIL e E2E_PASSWORD para rodar contra a API real');

const TABS = [
  ['Visão executiva', 'Receita total'],
  ['Front', 'Para onde vai o faturamento do tráfego'],
  ['Back-end', 'Receita Back-end Outros'],
  ['Call Center', 'Sobra do Call Center'],
  ['Recuperação', 'Vendas de recuperação'],
  ['Afiliados', 'Ranking de afiliados'],
  ['Custos Fixos', 'Total de custos'],
  ['Lançamentos', 'Novo lançamento'],
  ['Reembolsos', 'Perda total'],
  ['Campanhas', 'Cobertura RedTrack'],
  ['Integrações', 'Estado geral'],
] as const;

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('E-mail ou usuário').fill(process.env.E2E_EMAIL!);
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('group', { name: 'Receita total' })).toBeVisible();
}

test('login real, todas as abas carregam sem erros e dados reais aparecem', async ({ page }) => {
  const erros: string[] = [];
  const nao401Refresh: string[] = [];
  page.on('console', (m: ConsoleMessage) => {
    // o navegador loga todo 401; os esperados (tentativa de recuperar sessão sem cookie) são validados abaixo por URL
    if (m.type() === 'error' && !/status of 401/.test(m.text())) erros.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() === 401 && !r.url().includes('/auth/refresh')) nao401Refresh.push(r.url());
  });
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
  await login(page);

  // valor monetário real renderizado (R$ 1.234,56), não "Indisponível" nem skeleton eterno
  await expect(page.getByRole('group', { name: 'Receita total' })).toContainText(/R\$\s?[\d.]+,\d{2}/);
  await page.screenshot({ path: 'test-results/shots/dashboard.png', fullPage: true });

  const nav = page.getByRole('navigation', { name: 'Seções do financeiro' });
  for (const [aba, texto] of TABS) {
    await nav.getByRole('link', { name: aba, exact: true }).click(); // navegação interna: mantém a sessão em memória
    await expect(page.getByText(texto).first(), aba).toBeVisible();
    await expect(page.locator('[role="alert"]').filter({ hasText: /Sem conexão|Erro no servidor|Resposta inesperada|Não foi possível carregar/ }), `${aba}: sem estado de erro`).toHaveCount(0);
    await page.screenshot({ path: `test-results/shots/${aba.replace(/[^\w]+/g, '-')}.png`, fullPage: true });
  }

  expect(erros.filter((e) => !/favicon|ResizeObserver/.test(e)), 'erros de console').toEqual([]);
  expect(nao401Refresh, '401 fora do refresh de sessão').toEqual([]);
});

test('filtros vivem na URL e atualizam os dados; abas preservam período, comparação e critério', async ({ page }) => {
  await login(page);

  await page.getByRole('combobox', { name: /^Período/ }).click();
  await page.getByRole('option', { name: 'Últimos 7 dias' }).click();
  await expect(page).toHaveURL(/periodo=7d/);

  await page.getByRole('combobox', { name: /Comparar com/ }).click();
  await page.getByRole('option', { name: 'Período anterior' }).click();
  await expect(page).toHaveURL(/comparar=periodo-anterior/);
  await expect(page.getByText(/Comparando com/)).toBeVisible();

  await page.getByRole('combobox', { name: /Critério/ }).click();
  await page.getByRole('option', { name: /Vendas aprovadas/ }).click();
  await expect(page).toHaveURL(/modo=APROVADAS/);

  // o link só carrega os filtros depois que o React Router aplica a nova URL (transição); um clique humano nunca é mais rápido que isso
  const linkFront = page.getByRole('navigation', { name: 'Seções do financeiro' }).getByRole('link', { name: 'Front', exact: true });
  await expect(linkFront).toHaveAttribute('href', /modo=APROVADAS/);
  await linkFront.click();
  await expect(page).toHaveURL(/periodo=7d/);
  await expect(page).toHaveURL(/modo=APROVADAS/);
  await expect(page.getByText('Faturamento Front (Pagah)').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/shots/front-filtrado.png', fullPage: true });
});

test('tokens nunca ficam em localStorage/sessionStorage', async ({ page }) => {
  await login(page);
  const storage = await page.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage } }));
  expect(storage).not.toMatch(/eyJ|token|refresh|Bearer/i);
});

test('recarregar a página (F5) mantém a sessão: o cookie CSRF é legível pelo SPA', async ({ page }) => {
  await login(page);
  await page.getByRole('navigation', { name: 'Seções do financeiro' }).getByRole('link', { name: 'Front', exact: true }).click();
  await expect(page).toHaveURL(/\/front/);
  await page.reload();
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page).toHaveURL(/\/front/);
  await expect(page.getByText('Para onde vai o faturamento do tráfego').first()).toBeVisible();
});
