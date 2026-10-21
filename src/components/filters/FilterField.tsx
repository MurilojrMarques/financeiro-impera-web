import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Rótulo + controle de um filtro. O pontinho dourado no rótulo indica que o filtro está alterado (≠ padrão). */
export function FilterField({ label, htmlFor, active, hint, children, className }: {
  label: string;
  htmlFor?: string;
  active?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
        {label}
        {active && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}
      </Label>
      {children}
      {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Realce do campo quando o filtro está aplicado. */
export const activeFieldClass = 'border-primary/50 bg-primary/[0.06]';
