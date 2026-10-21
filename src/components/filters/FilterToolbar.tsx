import { ChevronDown, FilterX, SlidersHorizontal } from 'lucide-react';
import { useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFilters } from '@/hooks/useFilters';
import { formatRange } from '@/lib/dates';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import type { CriterioFinanceiro } from '@/types/api.types';
import type { ExtraFilterKey, FilterState } from '@/types/filters.types';
import { DateRangeFilter, PERIOD_LABEL } from './DateRangeFilter';
import {
  AffiliateFilter, AttendantFilter, CampaignFilter, GroupFilter, OriginFilter, PaymentMethodFilter, ProductFilter, SaleTypeFilter, StatusFilter, StoreFilter,
} from './ExtraFilters';
import { PeriodComparison } from './PeriodComparison';
import { SelectFilter } from './SelectFilter';

const CRITERIOS: { value: CriterioFinanceiro; label: string }[] = [
  { value: 'MOVIMENTACAO', label: 'Movimentação financeira' },
  { value: 'APROVADAS', label: 'Vendas aprovadas (painel Pagah)' },
];

interface Props {
  /** filtros adicionais exibidos nesta página */
  extras?: ExtraFilterKey[];
  showCompare?: boolean;
  showCriterio?: boolean;
}

/** Botão "Limpar filtros": volta ao padrão (mês atual, sem comparação, sem filtros adicionais). */
export function ClearFiltersButton({ className }: { className?: string }) {
  const { isDefault, resetAll } = useFilters();
  if (isDefault) return null;
  return (
    <Button variant="ghost" size="sm" onClick={resetAll} className={className}>
      <FilterX /> Limpar filtros
    </Button>
  );
}

/**
 * Barra de filtros globais da página. Tudo vive na URL (links compartilháveis) e vira parâmetros da API em um só lugar
 * (`toApiParams`).
 * - A partir de `md`: grade alinhada (3 colunas, 4 a partir de `lg`), sem controle órfão nem rótulo cortado.
 * - Celular: recolhida num cabeçalho com o período atual e o número de filtros ativos; toque para abrir.
 */
export function FilterToolbar({ extras = [], showCompare = true, showCriterio = true }: Props) {
  const { filters, range, compareRange, setFilters } = useFilters();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const base = { de: filters.de, ate: filters.ate, modo: filters.modo };

  const set = (k: ExtraFilterKey) => (v: string | undefined) => setFilters({ [k]: v } as Partial<FilterState>);

  const render = (k: ExtraFilterKey) => {
    const p = { value: filters[k], onChange: set(k), base };
    switch (k) {
      case 'loja': return <StoreFilter key={k} {...p} />;
      case 'produto': return <ProductFilter key={k} {...p} />;
      case 'afiliadoId': return <AffiliateFilter key={k} {...p} />;
      case 'origem': return <OriginFilter key={k} {...p} />;
      case 'campanha': return <CampaignFilter key={k} {...p} />;
      case 'atendente': return <AttendantFilter key={k} {...p} />;
      case 'metodo': return <PaymentMethodFilter key={k} value={p.value} onChange={p.onChange} />;
      case 'status': return <StatusFilter key={k} value={p.value} onChange={p.onChange} />;
      case 'grupo': return <GroupFilter key={k} value={p.value} onChange={p.onChange} />;
      case 'tipo': return <SaleTypeFilter key={k} value={p.value} onChange={p.onChange} />;
    }
  };

  const criterioAlterado = showCriterio && filters.modo !== env.defaultCriterio;
  const activeCount =
    extras.filter((k) => !!filters[k]).length + (showCompare && filters.comparar !== 'nenhuma' ? 1 : 0) + (criterioAlterado ? 1 : 0) + (filters.periodo !== 'mes-atual' ? 1 : 0);

  return (
    <Card className="no-print p-3 sm:p-4" role="search" aria-label="Filtros">
      {/* celular: resumo + abrir/fechar */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 rounded-md text-left md:hidden"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-muted-foreground">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Filtros</span>
          <span className="block truncate text-[13px] font-medium">
            {PERIOD_LABEL[filters.periodo]} · {formatRange(range)}
          </span>
        </span>
        {activeCount > 0 && <Badge variant="gold" aria-label={`${activeCount} ${activeCount === 1 ? 'filtro alterado' : 'filtros alterados'}`}>{activeCount}</Badge>}
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      <div id={panelId} className={cn('gap-3 md:mt-0 md:grid md:grid-cols-3 lg:grid-cols-4', open ? 'mt-4 grid grid-cols-1 min-[480px]:grid-cols-2' : 'hidden')}>
        <DateRangeFilter preset={filters.periodo} range={range} onChange={(v) => setFilters(v)} />
        {showCompare && <PeriodComparison preset={filters.comparar} range={compareRange} base={range} onChange={(v) => setFilters(v)} />}
        {showCriterio && (
          <SelectFilter
            label="Critério"
            value={filters.modo}
            options={CRITERIOS}
            onChange={(v) => v && setFilters({ modo: v as CriterioFinanceiro })}
            allLabel={null}
            active={criterioAlterado}
          />
        )}
        {extras.map(render)}
        <ClearFiltersButton className="self-end justify-self-start max-md:col-span-full max-md:w-full" />
      </div>
    </Card>
  );
}
