import type { UseQueryResult } from '@tanstack/react-query';
import { useFilters } from '@/hooks/useFilters';
import { useReport } from '@/hooks/useReport';
import type { Params } from '@/lib/query-keys';
import type { ApiError, Result } from '@/types/api.types';
import type { ExtraFilterKey } from '@/types/filters.types';

interface Options {
  /** filtros adicionais aplicados à consulta (padrão: todos os presentes na URL) */
  keys?: readonly ExtraFilterKey[];
  /** parâmetros extras fixos (ex.: agrupamento) */
  extra?: Params;
  enabled?: boolean;
}

export interface WithComparison<T> {
  current: UseQueryResult<Result<T>, ApiError>;
  comparison: UseQueryResult<Result<T>, ApiError>;
  hasComparison: boolean;
}

/**
 * Executa a MESMA consulta para o período atual e (se ativo) para o período de comparação.
 * Os totais oficiais vêm sempre da API; o frontend só calcula a variação percentual para exibição.
 */
export function useWithComparison<T>(
  domain: string,
  resource: string,
  fetcher: (params: Params, signal: AbortSignal) => Promise<Result<T>>,
  options: Options = {},
): WithComparison<T> {
  const { apiParams, compareRange } = useFilters();
  const base = { ...apiParams(options.keys), ...options.extra };
  const current = useReport<T>(domain, resource, fetcher, base, { enabled: options.enabled });

  const cmpParams = compareRange ? { ...apiParams(options.keys, compareRange), ...options.extra } : base;
  const comparison = useReport<T>(domain, `${resource}#comparacao`, fetcher, cmpParams, {
    enabled: !!compareRange && (options.enabled ?? true),
  });
  return { current, comparison, hasComparison: !!compareRange };
}
