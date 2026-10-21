import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { percentChange, toneOf, type Change, type Polarity } from '@/lib/change';
import { formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const TONE_CLASS = { positive: 'text-positive', negative: 'text-negative', neutral: 'text-muted-foreground' } as const;

interface Props {
  change: Change | null;
  polarity?: Polarity;
  /** texto após o percentual, ex.: "vs. período anterior" */
  suffix?: string;
  className?: string;
}

/** O significado (bom/ruim) depende da métrica: queda de custo é positiva; queda de receita é negativa. */
export function PercentageChange({ change, polarity = 'up-is-good', suffix = 'vs. período anterior', className }: Props) {
  if (!change) {
    return <span className={cn('block text-xs text-muted-foreground', className)}>Sem base de comparação</span>;
  }
  const tone = toneOf(change.direction, polarity);
  const Icon = change.direction === 'up' ? ArrowUpRight : change.direction === 'down' ? ArrowDownRight : Minus;
  const palavra = change.direction === 'up' ? 'aumento' : change.direction === 'down' ? 'queda' : 'estável';
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-1 text-xs font-medium', TONE_CLASS[tone], className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="sr-only">{palavra} de </span>
        {formatPercentage(Math.abs(change.percent), 1)}
      </span>
      {suffix && <span className="font-normal text-muted-foreground">{suffix}</span>}
    </span>
  );
}

interface ComparisonProps {
  current: number | null | undefined;
  previous: number | null | undefined;
  polarity?: Polarity;
  suffix?: string;
  className?: string;
}

/** Calcula a variação entre dois totais OFICIAIS da API (apresentação) e exibe com a cor certa. */
export function ComparisonIndicator({ current, previous, polarity, suffix, className }: ComparisonProps) {
  return <PercentageChange change={percentChange(current, previous)} polarity={polarity} suffix={suffix} className={className} />;
}
