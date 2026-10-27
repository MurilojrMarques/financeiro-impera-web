import { expect, test } from '@playwright/test';
import { layoutProblems, settle } from './support/layout';
import { installMockApi } from './support/mock-api';

/** Tela de Comissões com API falsa. SHOTS=1 grava capturas em test-results/shots/comissoes/. */
for (const [nome, viewport] of [['desktop', { width: 1366, height: 800 }], ['celular', { width: 390, height: 844 }]] as const) {
  test(`comissões (${nome}): total, Front do copy por pessoa e MC BR fora da conta`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installMockApi(page);
    await page.goto('/comissoes?periodo=30d');
    await settle(page);

    await expect(page.getByText('MC BR não é comissão')).toBeVisible();
    await expect(page.getByText('Total de comissões').first()).toBeVisible();
    await expect(page.getByText('Front (Copy)').first()).toBeVisible();
    await expect(page.getByText('Backend Outros').first()).toBeVisible();
    await expect(page.getByText('YAN').locator('visible=true').first()).toBeVisible();
    await expect(page.getByText('CRISPIM').locator('visible=true').first()).toBeVisible();
    expect(await layoutProblems(page)).toEqual([]);
    if (process.env.SHOTS === '1') await page.screenshot({ path: `test-results/shots/comissoes/${nome}.png`, fullPage: true });
  });
}
