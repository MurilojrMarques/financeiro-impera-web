import { expect, type Page } from '@playwright/test';

/** Espera os dados carregarem (sem skeleton) e os gráficos medirem o tamanho. */
export async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[aria-label^="Carregando"]')).toHaveCount(0, { timeout: 15_000 });
  await page.waitForTimeout(350); // gráficos (ResizeObserver) terminam de medir
}

/** Retorna descrições dos problemas encontrados (lista vazia = layout íntegro). */
export async function layoutProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1) {
      // aponta quem ultrapassa a janela sem estar contido num contêiner de rolagem própria
      const contained = (el: HTMLElement): boolean => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox !== 'visible' && p.getBoundingClientRect().right <= de.clientWidth + 1) return true;
        }
        return false;
      };
      const culprits = [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > de.clientWidth + 1 && getComputedStyle(el).position !== 'fixed' && !contained(el);
        })
        .slice(0, 4)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/).slice(0, 4).join('.')} (${Math.round(el.getBoundingClientRect().right)}px)`);
      out.push(`página rola na horizontal (${de.scrollWidth}px > ${de.clientWidth}px) — ${culprits.join(' | ')}`);
    }

    for (const el of document.querySelectorAll<HTMLElement>('[data-kpi-value]')) {
      if (el.offsetParent === null) continue;
      const range = document.createRange();
      range.selectNodeContents(el);
      const text = range.getBoundingClientRect();
      const card = el.closest<HTMLElement>('[data-kpi-card]')?.getBoundingClientRect();
      const label = el.closest('[data-kpi-card]')?.getAttribute('aria-label') ?? '?';
      if (el.scrollWidth > el.clientWidth + 1) out.push(`KPI "${label}": valor ${el.scrollWidth}px não cabe em ${el.clientWidth}px`);
      else if (card && (text.right > card.right + 0.5 || text.left < card.left - 0.5)) out.push(`KPI "${label}": valor sai do card`);
    }

    // texto de botões/rótulos não pode vazar do seu contêiner direto
    for (const el of document.querySelectorAll<HTMLElement>('button, a[role="link"], [role="tab"]')) {
      if (el.offsetParent === null) continue;
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'visible' && el.clientWidth > 0) {
        out.push(`controle "${(el.textContent ?? '').trim().slice(0, 30)}" vaza do próprio quadro`);
      }
    }
    return out;
  });
}
