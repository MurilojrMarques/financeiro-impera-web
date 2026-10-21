import { describe, expect, it } from 'vitest';
import { percentChange, toneOf } from '@/lib/change';
import { can, canAccess } from '@/lib/permissions';

describe('percentChange', () => {
  it('calcula variação e direção', () => {
    expect(percentChange(150, 100)).toEqual({ percent: 50, direction: 'up' });
    expect(percentChange(50, 100)).toEqual({ percent: -50, direction: 'down' });
    expect(percentChange(100, 100)).toEqual({ percent: 0, direction: 'flat' });
  });
  it('sem base de comparação não inventa percentual', () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(10, null)).toBeNull();
    expect(percentChange(undefined, 10)).toBeNull();
  });
  it('base negativa usa módulo', () => {
    expect(percentChange(-50, -100)?.direction).toBe('up');
  });
});

describe('toneOf', () => {
  it('respeita a polaridade', () => {
    expect(toneOf('up', 'up-is-good')).toBe('positive');
    expect(toneOf('up', 'down-is-good')).toBe('negative');
    expect(toneOf('down', 'down-is-good')).toBe('positive');
    expect(toneOf('flat', 'up-is-good')).toBe('neutral');
    expect(toneOf('up', 'neutral')).toBe('neutral');
  });
});

describe('permissões por perfil (UI; backend é a autoridade)', () => {
  it('LEITURA só vê dashboard, integrações e configurações', () => {
    expect(canAccess('LEITURA', 'dashboard')).toBe(true);
    expect(canAccess('LEITURA', 'front')).toBe(false);
    expect(canAccess('LEITURA', 'custos')).toBe(false);
  });
  it('ANALISTA acessa relatórios mas não custos', () => {
    expect(canAccess('ANALISTA', 'call-center')).toBe(true);
    expect(canAccess('ANALISTA', 'custos')).toBe(false);
  });
  it('FINANCEIRO escreve custos; só ADMIN executa sync', () => {
    expect(can('FINANCEIRO', 'custos.write')).toBe(true);
    expect(can('FINANCEIRO', 'integracoes.executar')).toBe(false);
    expect(can('ADMIN', 'integracoes.executar')).toBe(true);
  });
  it('sem perfil nada é permitido', () => {
    expect(canAccess(undefined, 'dashboard')).toBe(false);
    expect(can(undefined, 'custos.write')).toBe(false);
  });
});
