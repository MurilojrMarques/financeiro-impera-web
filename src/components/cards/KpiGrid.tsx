import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * `cols` = máximo de colunas em telas largas. Sempre 2 no celular (a variável `--kpi-cols` alimenta o `.kpi-grid`).
 * A linha incompleta se estica (flex-grow), então 7 indicadores viram 4 + 3 sem buraco e sem card órfão.
 */
const COLS = {
  3: '[--kpi-cols:1] sm:[--kpi-cols:3]',
  4: '[--kpi-cols:2] lg:[--kpi-cols:4]',
  // 5 e 6 por linha só em telas muito largas (≥ 1536px); abaixo disso 3 por linha, com cards largos e números grandes
  // (nessas grades o teto do número é menor para que todos os cards da linha fiquem com o mesmo tamanho)
  5: '[--kpi-cols:2] md:[--kpi-cols:3] 2xl:[--kpi-cols:5] 2xl:[--kpi-max:1.5rem]',
  6: '[--kpi-cols:2] md:[--kpi-cols:3] 2xl:[--kpi-cols:6] 2xl:[--kpi-max:1.5rem]',
  7: '[--kpi-cols:2] md:[--kpi-cols:4]',
} as const;

export function KpiGrid({ children, cols = 6, className }: { children: ReactNode; cols?: keyof typeof COLS; className?: string }) {
  // celular (cards estreitos): teto de 24px; a partir de sm, 28px (as grades de 5–6 colunas redefinem em COLS)
  return <div className={cn('kpi-grid [--kpi-max:1.5rem] sm:[--kpi-max:1.75rem] lg:[--kpi-gap:1rem]', COLS[cols], className)}>{children}</div>;
}

/** Título curto que agrupa indicadores relacionados (evita uma "parede" de 12 cards iguais). */
export function KpiGroup({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      <h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}
