import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Contêiner com rolagem horizontal (tabelas largas) e região focável por teclado.
 * As sombras laterais indicam, sem script, que há mais colunas para o lado.
 */
export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement> & { containerClassName?: string; label?: string }>(
  ({ className, containerClassName, label, ...props }, ref) => (
    <div className={cn('thin-scrollbar scroll-shadow-x relative w-full overflow-x-auto', containerClassName)} role="region" aria-label={label} tabIndex={0}>
      <table ref={ref} className={cn('w-full caption-bottom border-collapse text-[13px] tabular', className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

export const TableHeader = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => <thead className={cn('border-b border-border', className)} {...props} />;
export const TableBody = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
export const TableFooter = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
  <tfoot className={cn('border-t border-border bg-surface/50 font-medium', className)} {...props} />
);

export const TableRow = ({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('group/row border-b border-border/60 transition-colors hover:bg-row-hover', className)} {...props} />
);

export const TableHead = ({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    scope="col"
    className={cn('h-10 whitespace-nowrap px-3 text-left align-middle text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-4 last:pr-4', className)}
    {...props}
  />
);

export const TableCell = ({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-3 py-2.5 align-middle first:pl-4 last:pr-4', className)} {...props} />
);
