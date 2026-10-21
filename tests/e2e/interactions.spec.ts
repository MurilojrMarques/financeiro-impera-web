import { expect, test, type Page } from '@playwright/test';
import { layoutProblems, settle } from './support/layout';
import { installMockApi } from './support/mock-api';

/**
 * Interações de navegação, filtros, tabelas e diálogos nos tamanhos de celular e desktop, com API falsa.
 *   npx playwright test interactions
 *   SHOTS=1 npx playwright test interactions     # grava capturas em test-results/shots/interacoes/ (ou em $SHOTS_DIR; o Playwright limpa test-results a cada execução)
 */
const SHOTS_DIR = process.env.SHOTS_DIR ?? 'test-results/shots';

async function snap(page: Page, name: string) {
  if (process.env.SHOTS === '1') await page.screenshot({ path: `${SHOTS_DIR}/interacoes/${name}.png` });
}

test.describe('celular (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('barra inferior navega, mantém o período e "Mais" abre as demais seções', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/dashboard?periodo=7d');
    await settle(page);

    const bar = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(bar).toBeVisible();
    // as abas do desktop não existem no celular
    await expect(page.getByRole('navigation', { name: 'Seções do financeiro' })).toBeHidden();

    await bar.getByRole('link', { name: 'Front' }).click();
    await expect(page).toHaveURL(/\/front\?.*periodo=7d/); // período acompanha o usuário entre as seções
    await expect(bar.getByRole('link', { name: 'Front' })).toHaveAttribute('aria-current', 'page');

    await bar.getByRole('button', { name: 'Mais' }).click();
    const sheet = page.getByRole('dialog', { name: 'Todas as seções' });
    await expect(sheet).toBeVisible();
    await snap(page, 'celular-mais');
    await sheet.getByRole('link', { name: 'Reembolsos' }).click();
    await expect(page).toHaveURL(/\/reembolsos/);
    await expect(sheet).toBeHidden();
    // "Mais" fica destacado quando a seção atual mora nele
    await expect(bar.getByRole('button', { name: 'Mais' })).toHaveClass(/text-primary/);
  });

  test('trocar de seção volta ao topo; paginar uma tabela mantém a posição da página', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/dashboard');
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, 1800));
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Front' }).click();
    await expect(page).toHaveURL(/\/front/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await settle(page);

    const paginacao = page.getByRole('navigation', { name: 'Paginação' }).last();
    await paginacao.scrollIntoViewIfNeeded();
    const antes = await page.evaluate(() => window.scrollY);
    await paginacao.getByRole('button', { name: 'Próxima página' }).click();
    await expect(page).toHaveURL(/page=2/);
    const depois = await page.evaluate(() => window.scrollY);
    expect(depois).toBeGreaterThan(500); // não pulou para o topo
    expect(Math.abs(depois - antes)).toBeLessThan(200);
  });

  test('avisos (toast) aparecem acima da barra de navegação inferior', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/integracoes');
    await settle(page);
    await page.getByRole('button', { name: /Sincronizar agora/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sincronizar' }).click();
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText('Sincronização iniciada');
    await page.waitForTimeout(500); // animação de entrada
    const t = (await toast.boundingBox())!;
    const nav = (await page.getByRole('navigation', { name: 'Navegação principal' }).boundingBox())!;
    expect(t.y + t.height).toBeLessThanOrEqual(nav.y + 1);
    expect(t.x).toBeGreaterThanOrEqual(0);
    expect(t.x + t.width).toBeLessThanOrEqual(390.5);
    await snap(page, 'celular-toast');
  });

  test('o título da aba acompanha a seção', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/dashboard');
    await settle(page);
    await expect(page).toHaveTitle('Visão executiva · Financeiro');
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Call Center' }).click();
    await expect(page).toHaveTitle('Call Center — Resultados · Financeiro');
  });

  test('perfil LEITURA: a barra inferior mostra só o que o perfil pode abrir', async ({ page }) => {
    await installMockApi(page, { perfil: 'LEITURA' });
    await page.goto('/dashboard');
    await settle(page);
    const bar = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(bar.getByRole('link')).toHaveText(['Visão', 'Integrações']);
    await bar.getByRole('button', { name: 'Mais' }).click();
    const sheet = page.getByRole('dialog', { name: 'Todas as seções' });
    await expect(sheet.getByRole('link')).toHaveText(['Configurações']);
  });

  test('selects e calendário abrem acima do diálogo (formulário de custo)', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/custos/fixos');
    await settle(page);
    await page.getByRole('button', { name: /Novo custo/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Novo custo' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('combobox', { name: /^Tipo/ }).click();
    const opcao = page.getByRole('option', { name: 'Telefonia' });
    await expect(opcao).toBeVisible();
    await opcao.click();
    await expect(dialog.getByRole('combobox', { name: /^Tipo/ })).toContainText('Telefonia');

    await dialog.getByRole('button', { name: /^Vencimento/ }).click(); // o <label> dá o nome ao botão de data
    await expect(page.locator('.financeiro-calendar')).toBeVisible();
    const cal = (await page.locator('.financeiro-calendar').boundingBox())!;
    expect(cal.x).toBeGreaterThanOrEqual(0);
    expect(cal.x + cal.width).toBeLessThanOrEqual(390.5); // o calendário cabe na tela do celular
    await snap(page, 'celular-calendario-no-dialogo');
  });

  test('cabeçalho fica fixo no topo ao rolar e mostra o estado dos dados', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/dashboard');
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, 900));
    const header = page.getByRole('banner');
    await expect(header).toBeInViewport({ ratio: 1 });
    await expect(header.getByTestId('sync-status')).toContainText('Desatualizado');
    expect((await header.boundingBox())!.y).toBe(0);
  });

  test('filtros começam recolhidos com resumo; abrir mostra os campos e o período vai para a URL', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/front');
    await settle(page);

    const toggle = page.getByRole('button', { name: /^Filtros/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toContainText('Mês atual');
    await expect(page.getByRole('combobox', { name: /^Período/ })).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await snap(page, 'celular-filtros-abertos');
    await page.getByRole('combobox', { name: /^Período/ }).click();
    await page.getByRole('option', { name: 'Últimos 7 dias' }).click();
    await expect(page).toHaveURL(/periodo=7d/);
    await expect(toggle).toContainText('Últimos 7 dias');
    await expect(toggle.getByLabel(/filtro/)).toHaveText('1'); // contador de filtros alterados
  });

  test('vários avisos viram um cartão recolhido que se abre ao toque', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/front');
    await settle(page);
    const resumo = page.getByRole('button', { name: /3 avisos sobre este cálculo/ });
    await expect(resumo).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByText('9 itens sem quantidade no nome do kit')).toBeHidden();
    await resumo.click();
    await expect(page.getByText('9 itens sem quantidade no nome do kit')).toBeVisible();
  });

  test('tabelas viram cartões com ordenação própria; a tabela não é renderizada', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/dashboard');
    await settle(page);
    const lista = page.getByRole('list', { name: 'Receita por loja' });
    await expect(lista).toBeVisible();
    await expect(page.getByRole('table', { name: 'Receita por loja' })).toBeHidden();
    const primeiro = await lista.getByRole('listitem').first().innerText();
    expect(primeiro).toContain('NeuroSilence Gotas'); // maior receita primeiro

    // ordena por nome (começa decrescente, Z→A) e inverte a direção (A→Z): a primeira loja passa a ser a de menor nome
    await page.getByRole('combobox', { name: 'Ordenar por' }).first().click();
    await page.getByRole('option', { name: /^Loja$/ }).click();
    await page.getByRole('button', { name: 'Ordem decrescente: inverter' }).first().click();
    await expect(lista.getByRole('listitem').first()).toContainText('Articure Gotas');
    await expect(page.getByRole('button', { name: 'Ordem crescente: inverter' }).first()).toBeVisible();
  });

  test('diálogo vira folha colada na base, cabe na largura e rola por dentro', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/front');
    await settle(page);
    await page.getByRole('button', { name: /Ajustar taxas e linhas/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Ajustar taxas e linhas' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Taxa de cartão')).toBeVisible();
    await page.waitForTimeout(400); // fim da animação de entrada
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390.5);
    expect(Math.round(box.y + box.height)).toBe(844); // colada na base
    expect(box.y).toBeGreaterThan(0); // não cobre a tela inteira (alça + espaço do topo)
    await snap(page, 'celular-dialogo');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('alvos de toque dos controles principais têm pelo menos 40px de altura', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/dashboard');
    await settle(page);
    await page.getByRole('button', { name: /^Filtros/ }).click();
    const small: string[] = [];
    for (const loc of [
      page.getByRole('button', { name: 'Atualizar dados desta tela' }),
      page.getByRole('button', { name: 'Menu do usuário' }),
      page.getByRole('combobox', { name: /^Período/ }),
      page.getByRole('combobox', { name: /^Comparar com/ }),
      page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link').first(),
    ]) {
      const b = (await loc.boundingBox())!;
      if (b.height < 40 || b.width < 36) small.push(`${Math.round(b.width)}×${Math.round(b.height)}`);
    }
    expect(small, 'alvos de toque pequenos').toEqual([]);
  });

  test('campos de texto usam 16px (sem zoom automático do iPhone)', async ({ page }) => {
    await installMockApi(page, { unauthenticated: true });
    await page.goto('/login');
    const size = await page.getByLabel('E-mail').evaluate((el) => getComputedStyle(el).fontSize);
    expect(size).toBe('16px');
  });
});

test.describe('celular mínimo (320×568)', () => {
  test.use({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  for (const [rota, abrir, nome] of [
    ['/custos/fixos', /Novo custo/, 'Novo custo'],
    ['/front', /Ajustar taxas e linhas/, 'Ajustar taxas e linhas'],
  ] as const) {
    test(`diálogo "${nome}" cabe em 320px sem rolagem horizontal`, async ({ page }) => {
      await installMockApi(page);
      await page.goto(rota);
      await settle(page);
      await page.getByRole('button', { name: abrir }).click();
      const dialog = page.getByRole('dialog', { name: nome });
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(400);
      const { sw, cw } = await dialog.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
      expect(sw, 'rolagem horizontal dentro do diálogo').toBeLessThanOrEqual(cw + 1);
      const box = (await dialog.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(320.5);
    });
  }
});

test.describe('desktop (1440×900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Critério lista cada opção uma única vez', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/dashboard');
    await settle(page);
    await page.getByRole('combobox', { name: /^Critério/ }).click();
    await expect(page.getByRole('option')).toHaveText(['Movimentação financeira', 'Vendas aprovadas (painel Pagah)']);
    await snap(page, 'desktop-criterio');
    await page.getByRole('option', { name: /Vendas aprovadas/ }).click();
    await expect(page).toHaveURL(/modo=APROVADAS/);
  });

  test('abas ficam fixas no topo ao rolar e a aba ativa tem aria-current', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/dashboard');
    await settle(page);
    const nav = page.getByRole('navigation', { name: 'Seções do financeiro' });
    await expect(nav.getByRole('link', { name: 'Visão executiva' })).toHaveAttribute('aria-current', 'page');
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(150);
    expect((await nav.boundingBox())!.y).toBe(0);
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden(); // sem barra inferior no desktop
  });

  test('combobox com busca: filtra, navega por setas e escolhe com Enter', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/dashboard');
    await settle(page);
    const loja = page.getByRole('combobox', { name: 'Loja' });
    await loja.click();
    const lista = page.getByRole('listbox', { name: 'Loja' });
    await expect(lista.getByRole('option').first()).toHaveText('Todos');
    await page.getByRole('textbox', { name: /Buscar em loja/ }).fill('ner');
    await expect(lista.getByRole('option')).toHaveText(['Todos', 'Nervepure']);
    await page.keyboard.press('ArrowDown'); // do campo de busca para a lista ("Todos")
    await page.keyboard.press('ArrowDown'); // Nervepure
    await expect(lista.getByRole('option', { name: 'Nervepure' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/loja=Nervepure/);
    await expect(loja).toContainText('Nervepure');
    await expect(page.getByRole('listbox', { name: 'Loja' })).toBeHidden();
    await snap(page, 'desktop-combobox-filtrado');
  });

  test('combobox sem resultado mostra a mensagem e Esc fecha', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/dashboard');
    await settle(page);
    await page.getByRole('combobox', { name: 'Loja' }).click();
    await page.getByRole('textbox', { name: /Buscar em loja/ }).fill('zzzz');
    await expect(page.getByText('Nenhum resultado')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('textbox', { name: /Buscar em loja/ })).toBeHidden();
  });

  test('impressão/PDF: sem navegação nem filtros, com cabeçalho próprio e tabelas (não cartões)', async ({ page }) => {
    await installMockApi(page);
    await page.setViewportSize({ width: 1123, height: 794 }); // A4 paisagem
    await page.goto('/dashboard');
    await settle(page);
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('banner')).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Seções do financeiro' })).toBeHidden();
    await expect(page.getByRole('search', { name: 'Filtros' })).toBeHidden();
    await expect(page.getByRole('heading', { name: /^Financeiro — Visão executiva/ })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Receita por loja' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Receita por loja' })).toBeHidden();
    await snap(page, 'desktop-impressao');
  });

  test('calendário do período usa as cores do tema (não o azul padrão da biblioteca)', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/dashboard?periodo=7d');
    await settle(page);
    await page.getByRole('button', { name: /Abrir calendário/ }).click();
    const cal = page.locator('.financeiro-calendar');
    await expect(cal).toBeVisible();
    const cores = await cal.evaluate((root) => {
      const css = (el: Element | null, prop: string) => (el ? getComputedStyle(el).getPropertyValue(prop) : 'ausente');
      return {
        seta: css(root.querySelector('.rdp-chevron'), 'fill'),
        hoje: css(root.querySelector('.rdp-today:not(.rdp-outside)'), 'color'),
        acento: getComputedStyle(root).getPropertyValue('--rdp-accent-color').trim(),
      };
    });
    expect(cores.acento.toLowerCase()).toBe('#d9b96e'); // o acento do tema (dourado), não o `blue` da biblioteca
    expect(cores.seta).not.toBe('rgb(0, 0, 255)'); // azul padrão
    expect(cores.hoje).toBe('rgb(217, 185, 110)'); // dourado do tema (hoje pode cair em outro mês: aceita ausente)
    await snap(page, 'desktop-calendario-periodo');
  });

  test('ordenar a tabela pelo cabeçalho inverte a ordem', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/dashboard');
    await settle(page);
    const tabela = page.getByRole('table', { name: 'Receita por loja' });
    await expect(tabela.getByRole('row').nth(1)).toContainText('NeuroSilence Gotas');
    await tabela.getByRole('button', { name: 'Ordenar por Loja' }).click(); // 1º clique: decrescente (Z→A)
    await tabela.getByRole('button', { name: 'Ordenar por Loja' }).click(); // 2º: crescente (A→Z)
    await expect(tabela.getByRole('row').nth(1)).toContainText('Articure Gotas');
  });
});

for (const [nome, viewport] of [['celular', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]] as const) {
  test.describe(`estados vazio e de erro — ${nome}`, () => {
    test.use({ viewport, hasTouch: nome === 'celular', isMobile: nome === 'celular' });

    for (const rota of ['/dashboard', '/front', '/call-center']) {
      test(`${rota} sem dados não quebra o layout`, async ({ page }) => {
        await installMockApi(page, { empty: true });
        await page.goto(rota);
        await settle(page);
        await expect(page.getByRole('main')).toBeVisible();
        expect(await layoutProblems(page), 'problemas de layout').toEqual([]);
        await snap(page, `${nome}-vazio${rota.replace(/\//g, '-')}`);
      });

      test(`${rota} com a API falhando mostra o erro e permite tentar de novo`, async ({ page }) => {
        await installMockApi(page, { failReports: true });
        await page.goto(rota);
        await settle(page);
        await expect(page.getByRole('alert').filter({ hasText: /Erro no servidor/ }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'Tentar novamente' }).first()).toBeVisible();
        expect(await layoutProblems(page), 'problemas de layout').toEqual([]);
        await snap(page, `${nome}-erro${rota.replace(/\//g, '-')}`);
      });
    }
  });
}
