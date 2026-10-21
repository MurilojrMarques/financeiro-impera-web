import { describe, expect, it } from 'vitest';
import { bpToText, parsePercentToBp } from '@/features/trafego/ParametrosDialog';
import { can, canAccess } from '@/lib/permissions';

describe('percentual em pontos-base (sem float)', () => {
  it.each([
    ['10', 1000],
    ['0,65', 65],
    ['2,14', 214],
    ['3%', 300],
    ['1,18', 118],
    ['100', 10000],
  ])('%s -> %i', (t, bp) => expect(parsePercentToBp(t)).toBe(bp));
  it.each(['', 'abc', '101', '-1', '1,234', '1.5'])('rejeita %j', (t) => expect(parsePercentToBp(t)).toBeNull());
  it('ida e volta', () => {
    for (const bp of [1000, 65, 300, 214, 118, 2000]) expect(parsePercentToBp(bpToText(bp))).toBe(bp);
  });
});

describe('permissões do tráfego', () => {
  it('ANALISTA vê; só FINANCEIRO/ADMIN ajustam parâmetros', () => {
    expect(canAccess('ANALISTA', 'trafego')).toBe(true);
    expect(canAccess('LEITURA', 'trafego')).toBe(false);
    expect(can('ANALISTA', 'trafego.parametros')).toBe(false);
    expect(can('FINANCEIRO', 'trafego.parametros')).toBe(true);
  });
});
