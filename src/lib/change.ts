export type ChangeDirection = 'up' | 'down' | 'flat';

export interface Change {
  percent: number;
  direction: ChangeDirection;
}

/**
 * Variação percentual entre dois TOTAIS OFICIAIS da API (apresentação, não cálculo financeiro).
 * Sem base de comparação (anterior = 0 ou ausente) => null: não inventamos "infinito" nem 0%.
 */
export function percentChange(current: number | null | undefined, previous: number | null | undefined): Change | null {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  if (previous === 0) return null;
  const percent = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(percent * 10) / 10;
  return { percent: rounded, direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat' };
}

/**
 * `up-is-good`: receita, pedidos, comissão, resultado, margem.
 * `down-is-good`: custos, estornos, chargebacks (queda é positiva).
 */
export type Polarity = 'up-is-good' | 'down-is-good' | 'neutral';

export type Tone = 'positive' | 'negative' | 'neutral';

export function toneOf(direction: ChangeDirection, polarity: Polarity): Tone {
  if (direction === 'flat' || polarity === 'neutral') return 'neutral';
  const good = polarity === 'up-is-good' ? direction === 'up' : direction === 'down';
  return good ? 'positive' : 'negative';
}
