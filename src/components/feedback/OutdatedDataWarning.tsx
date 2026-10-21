import { Clock3, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatRelativeSyncTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Notice } from './Notice';

interface Props {
  /** última sincronização conhecida (ISO) */
  lastSync?: string | null;
  /** o backend marcou os dados como desatualizados */
  outdated?: boolean;
  /** a última tentativa de atualizar falhou, mas há dados antigos na tela */
  fetchFailed?: boolean;
  className?: string;
}

/**
 * Nunca apresenta dado antigo como se fosse novo:
 * - dados desatualizados (planilha não sincronizou) => aviso âmbar com "há X minutos";
 * - falha ao atualizar com dados em cache => "Exibindo as últimas informações disponíveis".
 */
export function OutdatedDataWarning({ lastSync, outdated, fetchFailed, className }: Props) {
  if (!outdated && !fetchFailed) return null;
  return (
    <Notice tone="warning" icon={fetchFailed ? WifiOff : Clock3} className={cn('no-print', className)}>
      {fetchFailed && <span>Não foi possível atualizar os dados. Exibindo as últimas informações disponíveis. </span>}
      {outdated && (
        <span>
          Os dados estão desatualizados: última sincronização {lastSync ? <RelativeTime iso={lastSync} /> : 'indisponível'}. Os números podem não incluir as vendas mais recentes.
        </span>
      )}
    </Notice>
  );
}

/** "há 4 minutos" que se atualiza sozinho. */
export function RelativeTime({ iso }: { iso: string | null | undefined }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  return <time dateTime={iso ?? undefined}>{formatRelativeSyncTime(iso)}</time>;
}
