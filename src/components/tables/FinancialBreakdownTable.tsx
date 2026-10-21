import type { ReactNode } from 'react';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { ComparisonIndicator } from '@/components/cards/PercentageChange';
import { ContentSection } from '@/components/layout/ContentSection';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatPercentage } from '@/lib/formatters';
import { DataTable, type Column } from './DataTable';

export interface BreakdownRow {
  id: string;
  label: string;
  /** "como é calculado" */
  method?: string;
  valueCentavos: number;
  /** participação sobre a receita (já calculada pela API, quando disponível) */
  percentOfRevenue?: number | null;
  perOrderCentavos?: number | null;
  previousCentavos?: number | null;
}

interface Props {
  title: string;
  description?: string;
  rows: BreakdownRow[];
  totalLabel?: string;
  totalCentavos?: number;
  /** exibir colunas de comparação */
  showComparison?: boolean;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyText?: string;
  footer?: ReactNode;
}

/** Tabela "para onde vai a receita": custo · como é calculado · valor · % da receita (barra) · por pedido · comparação. */
export function FinancialBreakdownTable({
  title, description, rows, totalLabel = 'Total', totalCentavos, showComparison, loading, error, onRetry, emptyText = 'Nenhum custo cadastrado para o período.', footer,
}: Props) {
  const maxPct = Math.max(1, ...rows.map((r) => Math.abs(r.percentOfRevenue ?? 0)));

  const columns: Column<BreakdownRow>[] = [
    { id: 'custo', header: 'Custo', mobile: 'title', cell: (r) => <span className="font-medium">{r.label}</span> },
    { id: 'como', header: 'Como é calculado', mobile: 'full', className: 'min-w-48 max-w-md', cell: (r) => <span className="text-xs leading-relaxed text-muted-foreground">{r.method ?? '—'}</span> },
    { id: 'valor', header: 'Valor', align: 'right', mobile: 'value', cell: (r) => <CurrencyValue centavos={r.valueCentavos} /> },
    {
      id: 'pct', header: '% da receita', className: 'min-w-40',
      cell: (r) =>
        r.percentOfRevenue === undefined || r.percentOfRevenue === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, (Math.abs(r.percentOfRevenue) / maxPct) * 100)}%` }} />
            </div>
            <span className="tabular w-14 text-right text-xs">{formatPercentage(r.percentOfRevenue)}</span>
          </div>
        ),
    },
    { id: 'pedido', header: 'Por pedido', align: 'right', cell: (r) => <CurrencyValue centavos={r.perOrderCentavos} /> },
    ...(showComparison
      ? [{ id: 'vs', header: 'vs. anterior', align: 'right' as const, cell: (r: BreakdownRow) => <ComparisonIndicator current={r.valueCentavos} previous={r.previousCentavos} polarity="down-is-good" suffix="" /> }]
      : []),
  ];

  /** Celular: nome + valor, o método (só se existir) e as razões numa linha. */
  const card = (r: BreakdownRow) => (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14px] font-medium leading-snug">{r.label}</p>
        <p className="shrink-0 text-[15px] font-semibold leading-snug tabular"><CurrencyValue centavos={r.valueCentavos} /></p>
      </div>
      {r.method && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.method}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {r.percentOfRevenue !== undefined && r.percentOfRevenue !== null && (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-surface" aria-hidden="true">
              <span className="block h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, (Math.abs(r.percentOfRevenue) / maxPct) * 100)}%` }} />
            </span>
            <span><span className="tabular text-foreground">{formatPercentage(r.percentOfRevenue)}</span> da receita</span>
          </span>
        )}
        {r.perOrderCentavos !== undefined && r.perOrderCentavos !== null && (
          <span><span className="tabular text-foreground"><CurrencyValue centavos={r.perOrderCentavos} /></span> por pedido</span>
        )}
        {showComparison && <ComparisonIndicator current={r.valueCentavos} previous={r.previousCentavos} polarity="down-is-good" suffix="" />}
      </div>
    </div>
  );

  const total = totalCentavos !== undefined && (
    <TableRow className="hover:bg-transparent">
      <TableCell className="font-semibold" colSpan={2}>{totalLabel}</TableCell>
      <TableCell className="text-right font-semibold"><CurrencyValue centavos={totalCentavos} className="text-primary" /></TableCell>
      <TableCell colSpan={showComparison ? 3 : 2} />
    </TableRow>
  );

  return (
    <ContentSection title={title} description={description}>
      <DataTable
        caption={title}
        columns={columns}
        data={loading || error ? undefined : rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        empty={{ title: emptyText }}
        mobileCard={card}
        footer={total || undefined}
        mobileFooter={
          totalCentavos !== undefined ? (
            <div className="flex items-center justify-between gap-3 px-3.5 py-3 text-[14px] font-semibold">
              <span>{totalLabel}</span>
              <CurrencyValue centavos={totalCentavos} className="text-primary" />
            </div>
          ) : undefined
        }
      />
      {footer && <div className="px-1 text-xs leading-relaxed text-muted-foreground">{footer}</div>}
    </ContentSection>
  );
}
