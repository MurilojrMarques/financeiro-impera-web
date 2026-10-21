import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { env } from '@/lib/env';
import { qk, type Params } from '@/lib/query-keys';
import { ApiError, type PagedResult, type Result } from '@/types/api.types';

type Fetcher<T> = (params: Params, signal: AbortSignal) => Promise<Result<T>>;
type PagedFetcher<T> = (params: Params, signal: AbortSignal) => Promise<PagedResult<T>>;

interface Options {
  /** false desliga a atualização automática (ex.: tabelas pesadas) */
  autoRefresh?: boolean;
  enabled?: boolean;
}

const refetchMs = (o: Options) => (o.autoRefresh === false || env.refreshKpiMs === 0 ? false : env.refreshKpiMs);

/** Só vale a pena repetir falhas de rede/serviço; 4xx/contrato inválido falham de imediato. */
export const retryPolicy = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError) return error.isRetryable && failureCount < 2;
  return false;
};

/**
 * Consulta de relatório: filtros fazem parte da chave (cache por consulta), a requisição anterior é CANCELADA
 * (AbortSignal do TanStack Query) quando os filtros mudam, e os dados anteriores permanecem na tela durante o carregamento
 * (sem piscar zeros).
 */
export function useReport<T>(
  domain: string,
  resource: string,
  fetcher: Fetcher<T>,
  params: Params,
  options: Options = {},
): UseQueryResult<Result<T>, ApiError> {
  return useQuery<Result<T>, ApiError>({
    queryKey: qk.report(domain, resource, params),
    queryFn: ({ signal }) => fetcher(params, signal),
    enabled: options.enabled ?? true,
    refetchInterval: refetchMs(options),
    placeholderData: keepPreviousData,
    retry: retryPolicy,
  });
}

export function usePagedReport<T>(
  domain: string,
  resource: string,
  fetcher: PagedFetcher<T>,
  params: Params,
  options: Options = {},
): UseQueryResult<PagedResult<T>, ApiError> {
  return useQuery<PagedResult<T>, ApiError>({
    queryKey: qk.report(domain, resource, params),
    queryFn: ({ signal }) => fetcher(params, signal),
    enabled: options.enabled ?? true,
    refetchInterval: refetchMs(options),
    placeholderData: keepPreviousData,
    retry: retryPolicy,
  });
}
