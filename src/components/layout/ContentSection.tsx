import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Seção de página com título (h3), descrição e ações. No celular as ações vão para baixo do título e ocupam a largura
 * toda (busca, abas segmentadas); `min-w-0` impede que o conteúdo (tabelas) alargue a coluna da grade.
 */
export function ContentSection({ title, description, actions, children, className }: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0 space-y-3', className)}>
      {(title || actions) && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold leading-snug">{title}</h2>}
            {description && <p className="mt-0.5 max-w-3xl text-[13px] leading-snug text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="no-print min-w-0 max-w-full sm:shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
