import { describe, expect, it } from 'vitest';
import { addDays, comparisonRange, formatDate, isValidYmd, previousPeriod, rangeForPreset, todaySP } from '@/lib/dates';

describe('datas em America/Sao_Paulo', () => {
  it('todaySP usa o dia de Brasília, não o UTC', () => {
    // 01:30 UTC do dia 21 ainda é dia 20 em Brasília (UTC-3)
    expect(todaySP(new Date('2026-10-21T01:30:00Z'))).toBe('2026-10-20');
    expect(todaySP(new Date('2026-10-21T03:00:00Z'))).toBe('2026-10-21');
  });
  it('isValidYmd rejeita datas impossíveis', () => {
    expect(isValidYmd('2026-02-30')).toBe(false);
    expect(isValidYmd('2026-10-20')).toBe(true);
    expect(isValidYmd('20/10/2026')).toBe(false);
    expect(isValidYmd(null)).toBe(false);
  });
  it('addDays cruza mês e ano', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
  it('presets', () => {
    const hoje = '2026-10-20';
    expect(rangeForPreset('hoje', hoje)).toEqual({ de: hoje, ate: hoje });
    expect(rangeForPreset('7d', hoje)).toEqual({ de: '2026-10-14', ate: hoje });
    expect(rangeForPreset('mes-atual', hoje)).toEqual({ de: '2026-10-01', ate: hoje });
    expect(rangeForPreset('mes-anterior', hoje)).toEqual({ de: '2026-09-01', ate: '2026-09-30' });
    expect(rangeForPreset('mes-anterior', '2026-03-15')).toEqual({ de: '2026-02-01', ate: '2026-02-28' });
  });
  it('período anterior tem a mesma duração', () => {
    expect(previousPeriod({ de: '2026-10-14', ate: '2026-10-20' })).toEqual({ de: '2026-10-07', ate: '2026-10-13' });
  });
  it('comparação', () => {
    const r = { de: '2026-10-01', ate: '2026-10-20' };
    expect(comparisonRange('nenhuma', r)).toBeNull();
    expect(comparisonRange('mes-anterior', r)).toEqual({ de: '2026-09-01', ate: '2026-09-20' });
    expect(comparisonRange('personalizado', r)).toBeNull();
    expect(comparisonRange('personalizado', r, { de: '2026-08-01', ate: '2026-08-10' })).toEqual({ de: '2026-08-01', ate: '2026-08-10' });
    expect(comparisonRange('personalizado', r, { de: '2026-08-10', ate: '2026-08-01' })).toBeNull();
  });
  it('formatDate sem fuso', () => {
    expect(formatDate('2026-10-01')).toBe('01/10/2026');
    expect(formatDate(null)).toBe('—');
  });
});
