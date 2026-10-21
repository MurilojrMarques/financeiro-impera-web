import { ChevronDown, CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type NoticeTone = 'info' | 'warning' | 'danger' | 'success';

/** Um único visual para todo aviso: cor só no ícone e no contorno; o texto continua em contraste alto. */
const TONE: Record<NoticeTone, { box: string; icon: string; Icon: LucideIcon }> = {
  info: { box: 'border-info/25 bg-info/[0.06]', icon: 'text-info', Icon: Info },
  warning: { box: 'border-warning/30 bg-warning/[0.07]', icon: 'text-warning', Icon: TriangleAlert },
  danger: { box: 'border-negative/30 bg-negative/[0.07]', icon: 'text-negative', Icon: CircleAlert },
  success: { box: 'border-positive/30 bg-positive/[0.07]', icon: 'text-positive', Icon: CircleCheck },
};

interface NoticeProps {
  tone?: NoticeTone;
  /** substitui o ícone padrão do tom */
  icon?: LucideIcon;
  title?: ReactNode;
  children: ReactNode;
  /** botão/link à direita (no celular vai para baixo do texto) */
  action?: ReactNode;
  role?: 'status' | 'alert' | 'note';
  className?: string;
}

export function Notice({ tone = 'info', icon, title, children, action, role, className }: NoticeProps) {
  const t = TONE[tone];
  const Icon = icon ?? t.Icon;
  return (
    <div
      role={role ?? (tone === 'danger' ? 'alert' : 'status')}
      className={cn('flex flex-col gap-2 rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed sm:flex-row sm:items-center sm:gap-3', t.box, className)}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className={cn('mt-0.5 size-4 shrink-0', t.icon)} aria-hidden="true" />
        <div className="min-w-0 text-foreground/90">
          {title && <p className="font-medium text-foreground">{title}</p>}
          <div className={cn(title && 'text-muted-foreground')}>{children}</div>
        </div>
      </div>
      {action && <div className="shrink-0 pl-7 sm:pl-0">{action}</div>}
    </div>
  );
}

export interface NoticeItem {
  key: string;
  tone?: NoticeTone;
  content: ReactNode;
}

/**
 * Vários avisos do mesmo bloco viram UM cartão (em vez de uma pilha de caixas).
 * No celular o cartão começa recolhido ("3 avisos sobre este cálculo") para não empurrar os números para baixo;
 * a partir de `md` mostra tudo. Com um único aviso, é só um `Notice`.
 */
export function NoticeList({ items, title = 'avisos sobre este cálculo', className }: { items: NoticeItem[]; title?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (items.length === 0) return null;
  if (items.length === 1) {
    const [only] = items;
    return (
      <Notice tone={only.tone ?? 'warning'} className={className}>
        {only.content}
      </Notice>
    );
  }
  const worst: NoticeTone = items.some((i) => i.tone === 'danger') ? 'danger' : items.some((i) => (i.tone ?? 'warning') === 'warning') ? 'warning' : 'info';
  const t = TONE[worst];
  return (
    <div className={cn('rounded-lg border text-[13px] leading-relaxed', t.box, className)}>
      {/* celular: botão que abre/fecha · a partir de md a lista é sempre visível e o título é só texto (nada "morto" no teclado) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left md:hidden"
      >
        <t.Icon className={cn('size-4 shrink-0', t.icon)} aria-hidden="true" />
        <span className="flex-1 font-medium">
          {items.length} {title}
        </span>
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <div className="hidden items-center gap-3 px-3.5 py-3 font-medium md:flex">
        <t.Icon className={cn('size-4 shrink-0', t.icon)} aria-hidden="true" />
        <span>
          {items.length} {title}
        </span>
      </div>
      <ul id={id} className={cn('space-y-2 border-t border-inherit px-3.5 py-3 text-foreground/85', open ? 'block' : 'hidden md:block')}>
        {items.map((i) => {
          const tone = TONE[i.tone ?? 'warning'];
          return (
            <li key={i.key} className="flex items-start gap-3">
              <tone.Icon className={cn('mt-0.5 size-3.5 shrink-0', tone.icon)} aria-hidden="true" />
              <span className="min-w-0">{i.content}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
