import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatInteger } from '@/lib/formatters';

export interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  disabled?: boolean;
  /** nome da tabela paginada: deixa o landmark "Paginação" único na página */
  label?: string;
}

const nav = 'size-8 pointer-coarse:size-10';

/**
 * Paginação do SERVIDOR (nunca carregamos milhares de linhas para paginar no navegador).
 * Celular: resumo no topo, "anterior / próxima" grandes e o seletor de linhas; ir à primeira/última página some (raro no toque).
 */
export function TablePagination({ page, limit, total, totalPages, onPageChange, onLimitChange, disabled, label }: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  const atStart = disabled || page <= 1;
  const atEnd = disabled || page >= totalPages;
  return (
    <nav aria-label={label ? `Paginação — ${label}` : 'Paginação'} className="no-print flex flex-col gap-3 border-t border-border px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite" className="text-center sm:text-left">
        {total === 0 ? 'Nenhum registro' : `${formatInteger(first)}–${formatInteger(last)} de ${formatInteger(total)}`}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        {onLimitChange && (
          <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))} disabled={disabled}>
            <SelectTrigger className="h-8 w-[7.25rem] text-xs pointer-coarse:h-10 pointer-coarse:text-sm" aria-label="Linhas por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>{n} / pág.</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className={`${nav} max-sm:hidden`} onClick={() => onPageChange(1)} disabled={atStart} aria-label="Primeira página">
            <ChevronsLeft />
          </Button>
          <Button variant="outline" size="icon" className={nav} onClick={() => onPageChange(page - 1)} disabled={atStart} aria-label="Página anterior">
            <ChevronLeft />
          </Button>
          <span className="tabular min-w-28 px-2 text-center">
            Página {formatInteger(page)} de {formatInteger(Math.max(totalPages, 1))}
          </span>
          <Button variant="outline" size="icon" className={nav} onClick={() => onPageChange(page + 1)} disabled={atEnd} aria-label="Próxima página">
            <ChevronRight />
          </Button>
          <Button variant="outline" size="icon" className={`${nav} max-sm:hidden`} onClick={() => onPageChange(totalPages)} disabled={atEnd} aria-label="Última página">
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </nav>
  );
}
