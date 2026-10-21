import type { CSSProperties, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Polarity } from '@/lib/change';
import { formatCurrency } from '@/lib/currency';
import { formatInteger, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { ComparisonIndicator } from './PercentageChange';

/** `ratio`: razão com 2 casas (ex.: ROAS 1,85) */
export type KpiFormat = 'currency' | 'integer' | 'percent' | 'ratio';

export interface KpiCardProps {
  label: string;
  /** undefined = indisponível · null = não informado · 0 = zero real */
  value: number | null | undefined;
  format?: KpiFormat;
  loading?: boolean;
  /** razão exibida quando indisponível */
  unavailableReason?: string;
  /** valor estimado (não confirmado pela fonte) */
  estimated?: boolean;
  /** valor parcial (faltam componentes, ex.: custos não cadastrados) */
  partial?: boolean;
  description?: ReactNode;
  /** valor do período de comparação; omitir quando não há comparação ativa */
  comparison?: { previous: number | null | undefined; loading?: boolean };
  polarity?: Polarity;
  highlight?: boolean;
  /** indicador principal da página: ocupa a linha inteira no celular e usa número maior */
  hero?: boolean;
  className?: string;
  /** tom do valor (ex.: resultado negativo em vermelho) */
  valueTone?: 'default' | 'positive' | 'negative';
}

function formatValue(v: number, f: KpiFormat): string {
  if (f === 'currency') return formatCurrency(v);
  if (f === 'percent') return formatPercentage(v);
  if (f === 'ratio') return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return formatInteger(v);
}

/**
 * O número cresce até o limite e encolhe para caber na largura do card (ver `.kpi-value` em globals.css):
 * `--kpi-chars` informa quantos caracteres há; a conta de largura é feita pelo navegador com container queries.
 */
export function KpiCard({
  label, value, format = 'currency', loading, unavailableReason, estimated, partial, description, comparison, polarity = 'up-is-good', highlight, hero, className, valueTone = 'default',
}: KpiCardProps) {
  let body: ReactNode;
  if (loading) {
    body = <Skeleton className="mt-2 h-7 w-28 max-w-full" />;
  } else if (value === undefined) {
    body = (
      <p className="mt-1.5 text-sm font-medium text-muted-foreground" title={unavailableReason}>
        Dados indisponíveis
        {unavailableReason && <span className="mt-1 block text-xs font-normal leading-snug">{unavailableReason}</span>}
      </p>
    );
  } else if (value === null) {
    body = <p className="mt-1.5 text-sm font-medium text-muted-foreground">Não informado</p>;
  } else {
    const text = formatValue(value, format);
    body = (
      /* altura reservada = teto do número: valores de tamanhos diferentes na mesma linha se apoiam na mesma linha de base */
      <div className="mt-1.5 flex min-h-[calc(var(--kpi-max,1.75rem)*1.25)] items-end">
        <p
          data-kpi-value
          style={{ '--kpi-chars': text.length } as CSSProperties}
          className={cn(
            'kpi-value tabular whitespace-nowrap font-semibold leading-tight tracking-tight',
            highlight && 'text-primary',
            valueTone === 'positive' && 'text-positive',
            valueTone === 'negative' && 'text-negative',
          )}
        >
          {text}
        </p>
      </div>
    );
  }

  const hasFooter = !!comparison || !!description;
  return (
    <Card
      data-kpi-card
      data-hero={hero ? '' : undefined}
      className={cn(
        '@container print-break-avoid flex flex-col justify-between p-3.5 sm:p-4',
        hero && 'max-sm:[--kpi-max:2.25rem]',
        highlight &&'border-primary/25 bg-[radial-gradient(120%_100%_at_100%_0%,color-mix(in_srgb,var(--primary)_11%,transparent),transparent_62%)]',
        className,
      )}
      role="group"
      aria-label={label}
    >
      <div>
        {/* celular (2 colunas): reserva 2 linhas de rótulo, assim os números de cards vizinhos ficam na mesma altura */}
        <div className={cn('flex min-h-5 items-start justify-between gap-2', !hero && 'max-sm:min-h-[1.9rem]')}>
          <p className="text-[11px] font-medium uppercase leading-snug tracking-wide text-muted-foreground">{label}</p>
          {!loading && (estimated || partial) && (
            <Badge variant="warning" className="shrink-0" title={estimated ? 'Inclui valores estimados' : 'Valor parcial'}>
              {estimated ? 'Estimado' : 'Parcial'}
            </Badge>
          )}
        </div>
        {body}
      </div>
      {hasFooter && (
        <div className="mt-2.5 space-y-1">
          {comparison &&
            (comparison.loading ? (
              <Skeleton className="h-3 w-24" />
            ) : (
              <ComparisonIndicator current={typeof value === 'number' ? value : undefined} previous={comparison.previous} polarity={polarity} />
            ))}
          {description && <p className="text-xs leading-snug text-muted-foreground">{description}</p>}
        </div>
      )}
    </Card>
  );
}
