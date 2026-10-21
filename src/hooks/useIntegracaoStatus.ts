import { useQuery } from '@tanstack/react-query';
import { env } from '@/lib/env';
import { qk } from '@/lib/query-keys';
import { integracoesService } from '@/services/integracoes.service';
import type { ApiError } from '@/types/api.types';
import type { IntegracaoStatus } from '@/types/financial.types';
import { retryPolicy } from './useReport';

/** Estado da sincronização (atualidade dos dados). Consultado a cada ~30 s enquanto a aba estiver visível. */
export function useIntegracaoStatus(enabled = true, fast = false) {
  return useQuery<IntegracaoStatus, ApiError>({
    queryKey: qk.integracaoStatus,
    queryFn: async ({ signal }) => (await integracoesService.status(signal)).data,
    enabled,
    // após disparar uma sincronização manual, consulta mais rápido por um tempo
    refetchInterval: fast ? 5000 : env.refreshStatusMs === 0 ? false : env.refreshStatusMs,
    retry: retryPolicy,
  });
}
