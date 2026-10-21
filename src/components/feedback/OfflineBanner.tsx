import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

function subscribe(cb: () => void): () => void {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

/** Aviso global quando o navegador perde a conexão. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="alert" className="no-print flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-xs font-medium text-white">
      <WifiOff className="size-4 shrink-0" aria-hidden="true" /> Você está sem conexão. Os dados exibidos podem estar desatualizados.
    </div>
  );
}
