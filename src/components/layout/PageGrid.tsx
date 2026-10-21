import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Grade de blocos da página. A coluna base é SEMPRE `minmax(0, 1fr)` (`grid-cols-1`): sem isso, abaixo do ponto de quebra
 * a coluna implícita é `auto` e cresce até a largura do conteúdo (tabela, texto sem quebra) — a página inteira passa a
 * rolar na horizontal no celular. `from` escolhe a largura em que as colunas aparecem: tabelas largas pedem `xl`.
 */
const GRID = {
  lg: { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3' },
  xl: { 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3' },
} as const;

export function PageGrid({ cols = 2, from = 'lg', children, className }: { cols?: 2 | 3; from?: keyof typeof GRID; children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4 lg:gap-5 [&>*]:min-w-0', GRID[from][cols], className)}>{children}</div>;
}

/** Ocupa 2 colunas de um `PageGrid` de 3 (ex.: gráfico de evolução ao lado da rosca). */
export function Span2({ children, from = 'lg' }: { children: ReactNode; from?: keyof typeof GRID }) {
  return <div className={cn('min-w-0', from === 'lg' ? 'lg:col-span-2' : 'xl:col-span-2')}>{children}</div>;
}
