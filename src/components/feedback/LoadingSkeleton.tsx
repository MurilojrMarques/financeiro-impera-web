import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Props {
  variant?: 'cards' | 'table' | 'chart' | 'page';
  rows?: number;
  cards?: number;
  /** altura do gráfico (px); precisa bater com a do gráfico real para a página não "pular" ao carregar */
  height?: number;
  className?: string;
}

/** Skeletons no formato dos componentes reais (nunca mostrar "0" enquanto carrega). */
export function LoadingSkeleton({ variant = 'page', rows = 6, cards = 6, height = 260, className }: Props) {
  if (variant === 'cards') {
    return (
      <div role="status" aria-label="Carregando indicadores" className={cn('kpi-grid [--kpi-cols:2] md:[--kpi-cols:3] xl:[--kpi-cols:6]', className)}>
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-28 max-w-full" />
            <Skeleton className="mt-3 h-3 w-24 max-w-full" />
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'table') {
    return (
      <div role="status" aria-label="Carregando tabela" className={cn('space-y-2', className)}>
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  if (variant === 'chart') {
    return <Skeleton role="status" aria-label="Carregando gráfico" className={cn('w-full', className)} style={{ height }} />;
  }
  return (
    <div role="status" aria-label="Carregando" className={cn('space-y-6', className)}>
      <LoadingSkeleton variant="cards" />
      <LoadingSkeleton variant="chart" />
      <LoadingSkeleton variant="table" />
    </div>
  );
}
