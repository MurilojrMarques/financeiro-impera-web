import type { ReactNode } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';

/**
 * Moldura das telas de autenticação. Desktop: painel da marca (logo original sobre fundo dourado/escuro) ao lado do formulário.
 * Celular: só o formulário, com o logo no topo. Respeita as áreas seguras do aparelho.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_srgb,var(--gold)_14%,transparent),transparent)] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="relative grid w-full max-w-sm overflow-hidden rounded-2xl border border-gold/30 bg-card shadow-2xl shadow-black/50 md:max-w-3xl md:grid-cols-[1.05fr_1fr]">
        <div className="gold-rule absolute inset-x-0 top-0" aria-hidden="true" />
        <aside className="relative hidden flex-col items-center justify-center gap-6 overflow-hidden border-r border-gold/20 bg-[linear-gradient(160deg,#1d1a12_0%,#0d0c09_100%)] p-10 text-center md:flex">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(90deg,var(--gold)_0,var(--gold)_2px,transparent_2px,transparent_46px)]" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-gold/15 blur-3xl" aria-hidden="true" />
          <BrandMark className="relative size-[150px]" />
          <div className="gold-rule relative w-28" aria-hidden="true" />
          <p className="relative max-w-[16rem] text-[13px] leading-relaxed text-muted-foreground">Painel financeiro do Grupo Impera: resultados, custos e operação em um só lugar.</p>
        </aside>
        <section className="p-6 sm:p-9">{children}</section>
      </div>
    </main>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-7 text-center md:text-left">
      <BrandMark className="mx-auto mb-4 size-[120px] md:hidden" />
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <div className="gold-rule mt-3 hidden w-16 md:block" aria-hidden="true" />
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}
