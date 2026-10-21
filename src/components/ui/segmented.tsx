import { useId, type KeyboardEvent } from 'react';
import { useScrollEdges } from '@/hooks/useScrollEdges';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
  label: string;
  className?: string;
}

/**
 * Alternador acessível (role=tablist, setas do teclado) para trocar visões de uma mesma tabela/seção.
 * Em telas estreitas rola na horizontal em vez de quebrar; cada opção tem altura de toque confortável.
 */
export function Segmented<T extends string>({ value, onChange, options, label, className }: Props<T>) {
  const id = useId();
  const { ref, onScroll } = useScrollEdges<HTMLDivElement>([options.length]);
  const move = (e: KeyboardEvent, i: number) => {
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const o = options[(next + options.length) % options.length];
    onChange(o.value);
    document.getElementById(`${id}-${o.value}`)?.focus();
  };
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      role="tablist"
      aria-label={label}
      className={cn('thin-scrollbar fade-edges-x no-print inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-border bg-surface p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          id={`${id}-${o.value}`}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => move(e, i)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors pointer-coarse:py-2.5 pointer-coarse:text-[13px]',
            value === o.value ? 'bg-card text-primary shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
