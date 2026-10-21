import { cn } from '@/lib/utils';

/** Logotipo original do Grupo Impera (arquivo `public/logo-grupo-impera.png`, fundo transparente). */
export function BrandMark({ className }: { className?: string }) {
  return <img src="/logo-grupo-impera.png" alt="Grupo Impera" className={cn('shrink-0 object-contain', className)} draggable={false} />;
}
