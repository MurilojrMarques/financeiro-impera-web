import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center', className)}>
      <div className="text-muted-foreground" aria-hidden="true">
        {icon ?? <Inbox className="size-7" />}
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-md text-xs text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

/** Estado vazio de tabela (dentro do corpo da tabela). */
export function EmptyTableState({ title = 'Nenhum registro encontrado', description }: { title?: string; description?: string }) {
  return <EmptyState title={title} description={description} className="border-0 py-8" />;
}
