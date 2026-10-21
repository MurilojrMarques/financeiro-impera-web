import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { RelativeTime } from '@/components/feedback/OutdatedDataWarning';
import { useIntegracaoStatus } from '@/hooks/useIntegracaoStatus';
import { cn } from '@/lib/utils';

type View = { icon: ReactNode; tone: string; text: ReactNode };

/** "Última atualização" do cabeçalho: sempre baseada no estado real da sincronização informado pela API. */
export function SyncStatus({ className }: { className?: string }) {
  const { data, isError, isPending } = useIntegracaoStatus();

  const spin = <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />;
  const warn = <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />;

  let view: View;
  if (isPending) view = { icon: spin, tone: 'text-muted-foreground', text: 'Verificando atualização…' };
  else if (isError || !data) view = { icon: warn, tone: 'text-warning', text: 'Estado da atualização indisponível' };
  else if (data.sincronizandoAgora) view = { icon: spin, tone: 'text-info', text: 'Sincronizando dados…' };
  else if (data.estado === 'NUNCA_SINCRONIZADO') view = { icon: warn, tone: 'text-warning', text: 'Ainda não sincronizado' };
  else if (data.dadosDesatualizados) view = { icon: warn, tone: 'text-warning', text: <>Desatualizado · <RelativeTime iso={data.ultimaSincronizacao} /></> };
  else view = { icon: <CircleCheck className="size-3.5 shrink-0" aria-hidden="true" />, tone: 'text-positive', text: <>Atualizado <RelativeTime iso={data.ultimaSincronizacao} /></> };

  return (
    <span role="status" className={cn('inline-flex min-w-0 items-center gap-1.5 text-xs', view.tone, className)} data-testid="sync-status">
      {view.icon}
      <span className="truncate">{view.text}</span>
    </span>
  );
}
