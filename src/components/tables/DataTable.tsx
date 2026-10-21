import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Fragment, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { EmptyTableState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SortOrder } from '@/hooks/useTableState';
import { cn } from '@/lib/utils';
import { TablePagination, type PaginationProps } from './TablePagination';

/**
 * Como a coluna aparece na LISTA DE CARTÕES do celular (< md; a tabela só existe a partir de `md`):
 * - `title`   título do cartão (padrão: a 1ª coluna)
 * - `value`   número em destaque à direita do título
 * - `actions` botões no rodapé do cartão
 * - `full`    campo que ocupa a linha inteira (textos longos)
 * - `hidden`  não aparece no cartão
 * - omitido   campo "rótulo / valor" numa grade de 2 colunas
 */
export type MobileSlot = 'title' | 'value' | 'actions' | 'full' | 'hidden';

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  /** nome enviado ao backend (`sortBy`) no modo servidor; no modo cliente, usa-se `sortValue` */
  sortKey?: string;
  sortValue?: (row: T) => string | number | null;
  className?: string;
  /** texto do cabeçalho para leitores de tela quando `header` for um ícone */
  headerLabel?: string;
  mobile?: MobileSlot;
}

export interface ServerSort {
  sortBy?: string;
  sortOrder: SortOrder;
  onChange: (sortBy: string, sortOrder: SortOrder) => void;
}

interface Props<T> {
  caption: string;
  columns: Column<T>[];
  data: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  /** busca em segundo plano (mantém linhas antigas na tela) */
  fetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: { title?: string; description?: string };
  /** ordenação feita pelo backend */
  serverSort?: ServerSort;
  /** ordenação local (para listas completas já agregadas pela API) */
  initialClientSort?: { columnId: string; order: SortOrder };
  pagination?: PaginationProps;
  /** linhas (`<tr>`) do rodapé da tabela */
  footer?: ReactNode;
  /** rodapé sob medida do celular (padrão: as mesmas linhas do `footer`) */
  mobileFooter?: ReactNode;
  /** faixa dentro do cartão, abaixo das linhas e acima da paginação (ex.: "Ver todas") */
  bodyFooter?: ReactNode;
  /** cartão sob medida do celular; sem ele o cartão é montado a partir de `Column.mobile` */
  mobileCard?: (row: T, index: number) => ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  dense?: boolean;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;
const NO_SORT = '__sem_ordem__';

const label = <T,>(c: Column<T>): ReactNode => c.headerLabel ?? c.header;

export function DataTable<T>({
  caption, columns, data, rowKey, loading, fetching, error, onRetry, empty, serverSort, initialClientSort, pagination, footer, mobileFooter, bodyFooter, mobileCard, onRowClick, className, dense,
}: Props<T>) {
  const [clientSort, setClientSort] = useState(initialClientSort);

  const rows = useMemo(() => {
    if (!data) return data;
    if (serverSort || !clientSort) return data;
    const col = columns.find((c) => c.id === clientSort.columnId);
    if (!col?.sortValue) return data;
    const dir = clientSort.order === 'ASC' ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1; // vazios sempre no fim
      if (vb === null) return -1;
      return (typeof va === 'string' && typeof vb === 'string' ? va.localeCompare(vb, 'pt-BR') : Number(va) - Number(vb)) * dir;
    });
  }, [data, clientSort, columns, serverSort]);

  const activeSort = (col: Column<T>): SortOrder | null => {
    if (serverSort) return col.sortKey && serverSort.sortBy === col.sortKey ? serverSort.sortOrder : null;
    return clientSort?.columnId === col.id ? clientSort.order : null;
  };

  const toggleSort = (col: Column<T>) => {
    const current = activeSort(col);
    const next: SortOrder = current === 'DESC' ? 'ASC' : 'DESC';
    if (serverSort && col.sortKey) serverSort.onChange(col.sortKey, next);
    else setClientSort({ columnId: col.id, order: next });
  };

  const sortable = (c: Column<T>) => !!c.sortable && (serverSort ? !!c.sortKey : !!c.sortValue);

  const onKey = (e: KeyboardEvent, row: T) => {
    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onRowClick(row);
    }
  };

  const sortableCols = columns.filter(sortable);
  const sortedCol = sortableCols.find((c) => activeSort(c));

  let body: ReactNode;
  if (error && !rows) body = <ErrorState error={error} onRetry={onRetry} compact className="m-3" />;
  else if (loading && !rows) body = <LoadingSkeleton variant="table" className="p-3" />;
  else if (rows && rows.length === 0) body = <EmptyTableState {...empty} />;
  else {
    body = (
      <>
        {/* ≥ md: tabela */}
        <div className="hidden md:block">
          <Table label={caption} aria-busy={fetching || undefined}>
            <caption className="sr-only">{caption}</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((c, ci) => {
                  const dir = activeSort(c);
                  return (
                    <TableHead
                      key={c.id}
                      className={cn(ALIGN[c.align ?? 'left'], ci === 0 && 'sticky left-0 z-[1] bg-card', c.className)}
                      aria-sort={dir ? (dir === 'ASC' ? 'ascending' : 'descending') : sortable(c) ? 'none' : undefined}
                    >
                      {sortable(c) ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c)}
                          className={cn('-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-1 uppercase tracking-wide transition-colors hover:text-foreground', dir && 'text-foreground', c.align === 'right' && 'flex-row-reverse')}
                          aria-label={`Ordenar por ${c.headerLabel ?? (typeof c.header === 'string' ? c.header : c.id)}`}
                        >
                          {c.header}
                          {dir === 'ASC' ? <ArrowUp className="size-3 text-primary" /> : dir === 'DESC' ? <ArrowDown className="size-3 text-primary" /> : <ChevronsUpDown className="size-3 opacity-40" />}
                        </button>
                      ) : (
                        c.header
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? []).map((row, i) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => onKey(e, row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(onRowClick && 'cursor-pointer', fetching && 'opacity-70')}
                >
                  {columns.map((c, ci) => (
                    <TableCell key={c.id} className={cn(ALIGN[c.align ?? 'left'], dense && 'py-1.5', ci === 0 && 'sticky left-0 z-[1] bg-card group-hover/row:bg-row-hover', c.className)}>
                      {c.cell(row, i)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            {footer && <TableFooter>{footer}</TableFooter>}
          </Table>
        </div>

        {/* < md: lista de cartões */}
        <div className="md:hidden" aria-busy={fetching || undefined}>
          {sortableCols.length > 0 && (
            <div className="no-print flex items-center gap-2 border-b border-border px-3 py-2">
              <span className="shrink-0 text-xs text-muted-foreground">Ordenar por</span>
              <Select
                value={sortedCol?.id ?? NO_SORT}
                onValueChange={(id) => {
                  const col = sortableCols.find((c) => c.id === id);
                  if (col) toggleSort(col);
                }}
              >
                <SelectTrigger className="h-9 min-w-0 flex-1 text-[13px]" aria-label="Ordenar por">
                  <SelectValue placeholder="Ordem padrão" />
                </SelectTrigger>
                <SelectContent>
                  {sortableCols.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{label(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                size="icon"
                className="size-9 shrink-0"
                disabled={!sortedCol}
                onClick={() => sortedCol && toggleSort(sortedCol)}
                aria-label={sortedCol && activeSort(sortedCol) === 'ASC' ? 'Ordem crescente: inverter' : 'Ordem decrescente: inverter'}
              >
                {sortedCol && activeSort(sortedCol) === 'ASC' ? <ArrowUp /> : <ArrowDown />}
              </Button>
            </div>
          )}
          <ul aria-label={caption} className="divide-y divide-border/60">
            {(rows ?? []).map((row, i) => (
              <li
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => onKey(e, row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn('px-3.5 py-3', onRowClick && 'cursor-pointer active:bg-row-hover', fetching && 'opacity-70')}
              >
                {mobileCard ? mobileCard(row, i) : <GenericCard row={row} index={i} columns={columns} />}
              </li>
            ))}
          </ul>
          {(mobileFooter ?? footer) && (
            <div className="border-t border-border bg-surface/50">
              {mobileFooter ?? (
                <table className="w-full text-[13px] tabular">
                  <tfoot>{footer}</tfoot>
                </table>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <Card className={cn('@container print-break-avoid overflow-hidden', className)}>
      {body}
      {bodyFooter && !error && <div className="no-print border-t border-border">{bodyFooter}</div>}
      {pagination && !error && <TablePagination {...pagination} label={caption} disabled={pagination.disabled || fetching} />}
    </Card>
  );
}

/** Cartão montado a partir das colunas (ver `MobileSlot`). */
function GenericCard<T>({ row, index, columns }: { row: T; index: number; columns: Column<T>[] }) {
  const visible = columns.filter((c) => c.mobile !== 'hidden');
  const title = visible.find((c) => c.mobile === 'title') ?? visible.find((c) => !c.mobile);
  const value = visible.find((c) => c.mobile === 'value');
  const actions = visible.filter((c) => c.mobile === 'actions');
  const fields = visible.filter((c) => c !== title && c !== value && c.mobile !== 'actions');

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-[14px] font-medium leading-snug [overflow-wrap:anywhere]">{title?.cell(row, index)}</div>
        {value && <div className="shrink-0 text-right text-[15px] font-semibold leading-snug tabular">{value.cell(row, index)}</div>}
      </div>
      {fields.length > 0 && (
        <dl className="mt-2.5 flex flex-wrap gap-x-6 gap-y-2.5">
          {fields.map((c) => (
            <div key={c.id} className={cn('min-w-0', c.mobile === 'full' && 'basis-full')}>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label(c)}</dt>
              <dd className="mt-0.5 text-[13px] leading-snug tabular [overflow-wrap:anywhere]">{c.cell(row, index)}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions.length > 0 && (
        <div className="no-print mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-border/60 pt-2">
          {actions.map((c) => (
            <Fragment key={c.id}>{c.cell(row, index)}</Fragment>
          ))}
        </div>
      )}
    </>
  );
}
