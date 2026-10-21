import type { ReactNode } from 'react';

/** Título da página + descrição curta + ações (ex.: botão "Novo"). No celular as ações vão para baixo. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold leading-tight">{title}</h2>
        {description && <p className="mt-1 max-w-3xl text-[13px] leading-snug text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}
