/**
 * Valores monetários do backend são CENTAVOS INTEIROS. Toda formatação usa aritmética inteira:
 * nunca dividimos por 100 para formatar (evita 0,1 + 0,2) nem fazemos somatórios financeiros aqui.
 */

const intFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function formatCurrency(centavos: number | null | undefined, opts: { showSign?: boolean; empty?: string } = {}): string {
  if (centavos === null || centavos === undefined || !Number.isFinite(centavos)) return opts.empty ?? '—';
  const neg = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const reais = Math.trunc(abs / 100);
  const cents = String(abs % 100).padStart(2, '0');
  const sign = neg ? '-' : opts.showSign && centavos > 0 ? '+' : '';
  return `${sign}R$ ${intFmt.format(reais)},${cents}`;
}

/** Texto digitado ("1.234,56", "R$ 12,5", "12") -> centavos inteiros. Inválido => null. */
export function parseMoneyToCentavos(input: string): number | null {
  const s = input.replace(/R\$/gi, '').replace(/\s/g, '');
  if (s === '' || !/^\d{1,3}(\.\d{3})*(,\d{0,2})?$|^\d+(,\d{0,2})?$/.test(s)) return null;
  const [int, frac = ''] = s.replace(/\./g, '').split(',');
  const cents = Number(int) * 100 + Number((frac + '00').slice(0, 2));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** centavos -> texto de campo ("1234,56") sem símbolo. */
export function centavosToInput(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return '';
  const abs = Math.abs(centavos);
  return `${centavos < 0 ? '-' : ''}${Math.trunc(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

/** Máscara de digitação: mantém só dígitos e formata como moeda BR (ex.: "12345" -> "123,45"). */
export function maskMoneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (digits === '') return '';
  const padded = digits.padStart(3, '0');
  const int = padded.slice(0, -2);
  const frac = padded.slice(-2);
  return `${intFmt.format(Number(int))},${frac}`;
}
