import {
  Headset, Layers, LayoutDashboard, Megaphone, PlugZap, ReceiptText, RefreshCcw, Settings, Store, Undo2, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import type { Area } from '@/lib/permissions';

export interface NavItem {
  to: string;
  label: string;
  /** rótulo curto da barra inferior do celular (padrão: `label`) */
  shortLabel?: string;
  /** nome da seção exibido no subtítulo do cabeçalho */
  section: string;
  area: Area;
  icon: LucideIcon;
}

/** Cada aba corresponde a uma rota real. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Visão executiva', shortLabel: 'Visão', section: 'Visão executiva', area: 'dashboard', icon: LayoutDashboard },
  { to: '/front', label: 'Front', section: 'Front — Tráfego', area: 'front', icon: Store },
  { to: '/backend', label: 'Back-end', section: 'Back-end', area: 'backend', icon: Layers },
  { to: '/call-center', label: 'Call Center', section: 'Call Center — Resultados', area: 'call-center', icon: Headset },
  { to: '/recuperacao', label: 'Recuperação', section: 'Recuperação de vendas', area: 'recuperacao', icon: RefreshCcw },
  { to: '/afiliados', label: 'Afiliados', section: 'Afiliados', area: 'afiliados', icon: Users },
  { to: '/custos/fixos', label: 'Custos Fixos', section: 'Custos Fixos', area: 'custos', icon: Wallet },
  { to: '/custos/call-center', label: 'Lançamentos', section: 'Call Center — Lançamentos', area: 'custos', icon: ReceiptText },
  { to: '/reembolsos', label: 'Reembolsos', section: 'Reembolsos', area: 'reembolsos', icon: Undo2 },
  { to: '/campanhas', label: 'Campanhas', section: 'Campanhas e RedTrack', area: 'campanhas', icon: Megaphone },
  { to: '/integracoes', label: 'Integrações', section: 'Integrações e Sincronização', area: 'integracoes', icon: PlugZap },
];

/** Fora das abas (fica no menu do usuário e em "Mais" no celular). */
export const SETTINGS_ITEM: Pick<NavItem, 'to' | 'label' | 'icon'> = { to: '/configuracoes', label: 'Configurações', icon: Settings };

export const EXTRA_SECTIONS: { prefix: string; section: string }[] = [
  { prefix: '/configuracoes', section: 'Configurações' },
  { prefix: '/afiliados/', section: 'Afiliados — Detalhe' },
];

export function sectionFor(pathname: string): string {
  const extra = EXTRA_SECTIONS.find((e) => pathname.startsWith(e.prefix));
  if (extra) return extra.section;
  const item = [...NAV_ITEMS].sort((a, b) => b.to.length - a.to.length).find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
  return item?.section ?? 'Financeiro';
}
