import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface SummaryRow {
  label: string;
  hint?: string;
  value: ReactNode;
  emphasis?: boolean;
}

/** Lista "rótulo ........ valor" para quebras financeiras curtas. */
export function FinancialSummary({ title, description, rows, loading, footer, action }: {
  title: string;
  description?: string;
  rows: SummaryRow[];
  loading?: boolean;
  footer?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="print-break-avoid h-full">
      <CardHeader className="flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        {action && <div className="no-print shrink-0">{action}</div>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: Math.max(rows.length, 4) }, (_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : (
          <dl className="divide-y divide-border/60">
            {rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="min-w-0 text-[13px] text-muted-foreground">
                  {r.label}
                  {r.hint && <span className="block text-xs">{r.hint}</span>}
                </dt>
                <dd className={cn('tabular shrink-0 text-right text-[13px]', r.emphasis && 'text-[15px] font-semibold text-primary')}>{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {footer && <div className="mt-3 text-xs leading-relaxed text-muted-foreground">{footer}</div>}
      </CardContent>
    </Card>
  );
}
