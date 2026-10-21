import { ChevronRight } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AltTable {
  columns: string[];
  rows: (string | number)[][];
}

interface Props {
  title: string;
  description?: string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: boolean;
  emptyText?: string;
  /** altura do gráfico em telas largas (px); no celular usa 80% (mín. 200) */
  height?: number;
  /** conteúdo com altura própria (listas); dispensa o contêiner de altura fixa */
  autoHeight?: boolean;
  actions?: ReactNode;
  /** alternativa textual (leitores de tela e impressão acessível) */
  altTable?: AltTable;
  /** resumo curto lido por leitores de tela */
  summary?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Moldura padrão de gráfico: título, estados (loading/erro/vazio) e alternativa textual dos dados.
 * O cartão ocupa a altura da linha da grade (gráficos vizinhos ficam alinhados) e vira container (`@container`),
 * para o conteúdo se adaptar à largura do CARTÃO, não da janela.
 */
export function ChartFrame({
  title, description, loading, error, onRetry, empty, emptyText = 'Sem dados para o período selecionado.', height = 260, autoHeight, actions, altTable, summary, className, children,
}: Props) {
  const mobileHeight = Math.max(200, Math.round(height * 0.8));
  const box = { '--chart-h': `${height}px`, '--chart-h-sm': `${mobileHeight}px` } as CSSProperties;
  return (
    <Card className={cn('@container print-break-avoid flex h-full flex-col', className)}>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        {actions && <div className="min-w-0 max-w-full sm:max-w-[65%]">{actions}</div>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {error ? (
          <ErrorState error={error} onRetry={onRetry} compact />
        ) : loading ? (
          <LoadingSkeleton variant="chart" height={autoHeight ? 180 : height} />
        ) : empty ? (
          <EmptyState title={emptyText} className="flex-1 py-8" />
        ) : (
          <figure aria-label={title} className="m-0 flex flex-1 flex-col">
            {autoHeight ? (
              children
            ) : (
              /* a altura mínima vem de --chart-h; o gráfico cresce se a linha da grade for mais alta (sem vazio sob ele).
                 O contêiner interno é absoluto para o ResponsiveContainer sempre medir uma altura definida. */
              <div style={box} className="relative min-h-[var(--chart-h-sm)] flex-1 sm:min-h-[var(--chart-h)]" role="img" aria-label={summary ?? title}>
                <div className="absolute inset-0">{children}</div>
              </div>
            )}
            {altTable && (
              <details className="no-print group mt-3 text-xs text-muted-foreground">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded py-1 pr-1 transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
                  Ver dados do gráfico em tabela
                </summary>
                <div className="thin-scrollbar mt-2 max-h-72 overflow-auto rounded-md border border-border">
                  <table className="w-full min-w-max text-left tabular">
                    <caption className="sr-only">{title}</caption>
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border">
                        {altTable.columns.map((c, i) => (
                          <th key={c} scope="col" className={cn('px-3 py-2 font-medium', i > 0 && 'text-right')}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {altTable.rows.map((r, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          {r.map((cell, j) => (
                            <td key={j} className={cn('px-3 py-1.5', j > 0 && 'text-right text-foreground')}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </figure>
        )}
      </CardContent>
    </Card>
  );
}
