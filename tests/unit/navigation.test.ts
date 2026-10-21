import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, SETTINGS_ITEM, sectionFor } from '@/app/navigation';
import { canAccess } from '@/lib/permissions';

describe('navegação', () => {
  it('toda seção tem ícone, rota única e rótulo', () => {
    const rotas = NAV_ITEMS.map((i) => i.to);
    expect(new Set(rotas).size).toBe(rotas.length);
    for (const item of NAV_ITEMS) {
      expect(item.icon).toBeTruthy();
      expect(item.label.length).toBeGreaterThan(0);
    }
    expect(SETTINGS_ITEM.icon).toBeTruthy();
  });

  it('o rótulo curto da barra do celular cabe (até 11 caracteres)', () => {
    for (const item of NAV_ITEMS) expect((item.shortLabel ?? item.label).length).toBeLessThanOrEqual(12);
  });

  it('sectionFor escolhe a seção mais específica', () => {
    expect(sectionFor('/custos/call-center')).toBe('Call Center — Lançamentos');
    expect(sectionFor('/custos/fixos')).toBe('Custos Fixos');
    expect(sectionFor('/afiliados/abc')).toBe('Afiliados — Detalhe');
    expect(sectionFor('/configuracoes')).toBe('Configurações');
    expect(sectionFor('/nao-existe')).toBe('Financeiro');
  });

  it('perfil LEITURA enxerga só visão executiva e integrações (a barra do celular lida com poucos itens)', () => {
    const visiveis = NAV_ITEMS.filter((i) => canAccess('LEITURA', i.area)).map((i) => i.to);
    expect(visiveis).toEqual(['/dashboard', '/integracoes']);
  });
});
