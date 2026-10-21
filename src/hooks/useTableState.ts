import { useCallback, useMemo } from 'react';
import { useUrlSearchParams } from './useUrlSearchParams';

export type SortOrder = 'ASC' | 'DESC';

export interface TableState {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder: SortOrder;
  busca: string;
}

/**
 * Estado de tabela na URL (compartilhável), com prefixo para várias tabelas na mesma página:
 * ?vendas.page=2&vendas.sortBy=valorVendaCentavos&vendas.sortOrder=ASC
 */
export function useTableState(id: string, defaults: { limit?: number; sortBy?: string; sortOrder?: SortOrder } = {}) {
  const { sp, update: updateUrl } = useUrlSearchParams();
  const key = (k: string) => `${id}.${k}`;

  const state = useMemo<TableState>(() => {
    const page = Number(sp.get(key('page')));
    const limit = Number(sp.get(key('limit')));
    const order = sp.get(key('sortOrder'));
    return {
      page: Number.isInteger(page) && page >= 1 ? page : 1,
      limit: [10, 20, 50, 100].includes(limit) ? limit : (defaults.limit ?? 20),
      sortBy: sp.get(key('sortBy')) ?? defaults.sortBy,
      sortOrder: order === 'ASC' || order === 'DESC' ? order : (defaults.sortOrder ?? 'DESC'),
      busca: sp.get(key('busca')) ?? '',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, id, defaults.limit, defaults.sortBy, defaults.sortOrder]);

  const update = useCallback(
    (patch: Partial<TableState>) => {
      updateUrl(
        (prev) => {
          const next = new URLSearchParams(prev);
          const apply = (k: keyof TableState, v: string | number | undefined) => {
            if (v === undefined || v === '' || (k === 'page' && v === 1)) next.delete(`${id}.${k}`);
            else next.set(`${id}.${k}`, String(v));
          };
          for (const [k, v] of Object.entries(patch) as [keyof TableState, string | number | undefined][]) apply(k, v);
          // mudar ordenação, limite ou busca volta para a página 1
          if (patch.page === undefined && ('sortBy' in patch || 'sortOrder' in patch || 'limit' in patch || 'busca' in patch)) next.delete(`${id}.page`);
          return next;
        },
        { replace: true },
      );
    },
    [updateUrl, id],
  );

  return { state, update };
}
