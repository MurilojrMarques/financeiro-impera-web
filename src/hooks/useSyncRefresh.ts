import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useIntegracaoStatus } from './useIntegracaoStatus';

/**
 * Atualiza os números só quando os dados MUDAM: a cada ~30 s consulta o estado (barato) e, se a última sincronização
 * for nova, refaz as consultas dos relatórios. Evita recarregar relatórios pesados de minuto em minuto sem necessidade.
 */
export function useSyncRefresh(): void {
  const qc = useQueryClient();
  const { data } = useIntegracaoStatus();
  const ultima = useRef<string | null | undefined>(undefined);
  const atual = data?.ultimaSincronizacao;

  useEffect(() => {
    if (data === undefined) return;
    if (ultima.current !== undefined && ultima.current !== atual) {
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'integracoes' && q.queryKey[0] !== 'auth' });
    }
    ultima.current = atual ?? null;
  }, [atual, data, qc]);
}
