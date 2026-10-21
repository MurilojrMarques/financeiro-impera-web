import { describe, expect, it } from 'vitest';
import { centavosToInput, formatCurrency, maskMoneyInput, parseMoneyToCentavos } from '@/lib/currency';

describe('formatCurrency (centavos inteiros)', () => {
  it('formata valores positivos, zero e negativos', () => {
    expect(formatCurrency(123456)).toBe('R$ 1.234,56');
    expect(formatCurrency(0)).toBe('R$ 0,00');
    expect(formatCurrency(-5)).toBe('-R$ 0,05');
    expect(formatCurrency(100000000)).toBe('R$ 1.000.000,00');
  });
  it('distingue zero de ausente', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatCurrency(null, { empty: 'n/d' })).toBe('n/d');
    expect(formatCurrency(Number.NaN)).toBe('—');
  });
  it('mostra sinal quando pedido', () => {
    expect(formatCurrency(1050, { showSign: true })).toBe('+R$ 10,50');
  });
});

describe('parseMoneyToCentavos', () => {
  it.each([
    ['1.234,56', 123456],
    ['R$ 12,5', 1250],
    ['12', 1200],
    ['0,07', 7],
  ])('%s -> %i', (input, expected) => expect(parseMoneyToCentavos(input)).toBe(expected));
  it.each(['', 'abc', '1,234,56', '12,345', '-5'])('rejeita %j', (input) => expect(parseMoneyToCentavos(input)).toBeNull());
  it('não sofre erro de ponto flutuante', () => {
    expect(parseMoneyToCentavos('0,10')! + parseMoneyToCentavos('0,20')!).toBe(30);
  });
});

describe('máscara e campo', () => {
  it('maskMoneyInput', () => {
    expect(maskMoneyInput('12345')).toBe('123,45');
    expect(maskMoneyInput('5')).toBe('0,05');
    expect(maskMoneyInput('')).toBe('');
    expect(maskMoneyInput('abc')).toBe('');
  });
  it('centavosToInput', () => {
    expect(centavosToInput(123456)).toBe('1234,56');
    expect(centavosToInput(null)).toBe('');
  });
});
