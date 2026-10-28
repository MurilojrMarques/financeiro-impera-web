import { expect, test } from '@playwright/test';
import path from 'node:path';
import { installMockApi } from './support/mock-api';

const FOTOS = process.env.RH_SHOTS ?? '';
const shot = async (page: import('@playwright/test').Page, nome: string) => {
  if (FOTOS) await page.screenshot({ path: path.join(FOTOS, `${nome}.png`), fullPage: true });
};

test.describe('RH', () => {
  test('RH que também é financeiro: vê o seletor de módulo, painel, colaboradores com salário, folha e monitoramento', async ({ page }) => {
    await installMockApi(page, { perfil: 'FINANCEIRO', rhPapel: 'RH', colaboradorId: 'c-bruno' });
    await page.goto('/rh');
    await expect(page).toHaveURL(/\/rh\/painel/);
    await expect(page.getByRole('navigation', { name: 'Módulo' })).toBeVisible();
    await expect(page.getByText('Folha mensal').first()).toBeVisible();
    await expect(page.getByText('R$ 20.500,00').first()).toBeVisible(); // 8.000 + 4.000 + 6.500 + 2.000
    await shot(page, 'rh-painel');

    await page.getByRole('link', { name: 'Colaboradores' }).click();
    await expect(page.getByRole('row', { name: /Ana Caroliny/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Salário' })).toBeVisible();
    await shot(page, 'rh-colaboradores');

    await page.getByRole('row', { name: /Ana Caroliny/ }).click();
    await expect(page).toHaveURL(/\/rh\/colaboradores\/c-ana/);
    await expect(page.getByText('Salário mensal atual').first()).toBeVisible();
    await expect(page.getByText('Promoção por desempenho').first()).toBeVisible();
    await expect(page.getByText('12.345.678/0001-90').first()).toBeVisible();
    await shot(page, 'rh-ficha');

    await page.getByRole('link', { name: 'Folha', exact: true }).click();
    await page.getByRole('row', { name: /Out\/2026/ }).first().click();
    await expect(page.getByText('Folha de Out/2026').first()).toBeVisible();
    await expect(page.getByText('22/30').first()).toBeVisible(); // proporcional
    await expect(page.getByRole('button', { name: /Fechar folha/ })).toBeVisible();
    await shot(page, 'rh-folha');

    await page.getByRole('link', { name: 'Comissões' }).click();
    await expect(page.getByText('Comissão do Front').first()).toBeVisible();
    await expect(page.getByText('Mês em aberto no sistema de copy').first()).toBeVisible();
    await expect(page.getByText('REAPER').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lançar na folha' })).toBeDisabled(); // mês provisório
    await shot(page, 'rh-comissoes');

    await page.getByRole('link', { name: 'Documentos' }).click();
    // abre na visão do mês: quem enviou a nota e quem falta
    await expect(page.getByText('Faltam enviar').first()).toBeVisible();
    await expect(page.getByText('Faltando').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Aprovar/ }).first()).toBeVisible();
    await shot(page, 'rh-notas-mes');
    await page.getByRole('tab', { name: 'Lista completa' }).click();
    await expect(page.getByText('NF-102-outubro.pdf').first()).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Colaborador' })).toBeVisible();
    await shot(page, 'rh-documentos');

    await page.getByRole('link', { name: 'Monitoramento' }).click();
    await expect(page.getByText('Alterações detectadas').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Conferir agora/ })).toBeVisible();
    await shot(page, 'rh-monitoramento');
  });

  test('gestor: só documentos, comissões e meu perfil; sem lista de colaboradores, folha nem monitoramento', async ({ page }) => {
    await installMockApi(page, { perfil: 'SEM_FINANCEIRO', rhPapel: 'GESTOR', colaboradorId: 'c-gestora' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/rh\/documentos/);
    await expect(page.getByRole('link', { name: 'Colaboradores' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Meu perfil' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Folha', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Monitoramento' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Módulo' })).toHaveCount(0); // sem financeiro: não há o que alternar
    await shot(page, 'rh-gestor');
  });

  test('colaborador: cai no próprio perfil e envia a nota fiscal; tentar abrir a folha mostra "sem permissão"', async ({ page }) => {
    await installMockApi(page, { perfil: 'SEM_FINANCEIRO', rhPapel: 'COLABORADOR', colaboradorId: 'c-ana' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/rh\/documentos/);
    await expect(page.getByRole('button', { name: /Enviar nota fiscal/ })).toBeVisible();
    await page.getByRole('button', { name: /Enviar nota fiscal/ }).click();
    await expect(page.getByRole('dialog').getByText('Enviar minha nota fiscal')).toBeVisible();
    await shot(page, 'rh-colaborador-enviar-nf');
    await page.keyboard.press('Escape');

    await page.getByRole('link', { name: 'Meu perfil' }).click();
    await expect(page.getByText('Salário mensal atual').first()).toBeVisible();
    await shot(page, 'rh-meu-perfil');

    await page.goto('/rh/folha');
    await expect(page.getByText(/permiss/i).first()).toBeVisible();
    // o financeiro também é bloqueado: quem só tem RH é levado de volta ao RH
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/rh/);
  });

  test('colaborador que abre uma tela do financeiro (link antigo) vai para o RH, não para "acesso negado"', async ({ page }) => {
    await installMockApi(page, { perfil: 'SEM_FINANCEIRO', rhPapel: 'COLABORADOR', colaboradorId: 'c-ana' });
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/rh\/documentos/);
    await expect(page.getByText('Acesso negado')).toHaveCount(0);
  });

  test('celular: abas rolam na horizontal e a tabela vira cartões @mobile', async ({ page }) => {
    await installMockApi(page, { perfil: 'SEM_FINANCEIRO', rhPapel: 'RH', colaboradorId: 'c-bruno' });
    await page.goto('/rh/colaboradores');
    await expect(page.getByText('Bruno Henrique Souza').locator('visible=true').first()).toBeVisible(); // a tabela só existe a partir de md: no celular são cartões
    const largura = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, janela: window.innerWidth }));
    expect(largura.doc).toBeLessThanOrEqual(largura.janela + 1); // sem rolagem horizontal da página
    await shot(page, 'rh-mobile-colaboradores');
  });
});
