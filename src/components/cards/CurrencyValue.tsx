import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface Props {
  /** centavos inteiros. undefined = indisponível; null = não informado; 0 = zero real. */
  centavos: number | null | undefined;
  loading?: boolean;
  /** valor calculado por estimativa/regra, não confirmado pela fonte */
  estimated?: boolean;
  showSign?: boolean;
  className?: string;
}

/**
 * Distingue com clareza: carregando (skeleton) · zero real ("R$ 0,00") · não informado · indisponível · estimado.
 */
export function CurrencyValue({ centavos, loading, estimated, showSign, className }: Props) {
  if (loading) return <Skeleton className={cn('inline-block h-5 w-24 align-middle', className)} />;
  if (centavos === undefined) {
    return (
      <span className={cn('text-muted-foreground', className)} title="Dado indisponível">
        Indisponível
      </span>
    );
  }
  if (centavos === null) {
    return (
      <span className={cn('text-muted-foreground', className)} title="Valor não informado na origem">
        Não informado
      </span>
    );
  }
  return (
    <span className={cn('tabular whitespace-nowrap', className)} title={estimated ? 'Valor estimado' : undefined}>
      {formatCurrency(centavos, { showSign })}
      {estimated && (
        <sup className="ml-0.5 text-[10px] text-warning" aria-label="estimado">
          est.
        </sup>
      )}
    </span>
  );
}
