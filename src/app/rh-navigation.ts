import { Activity, BriefcaseBusiness, FileText, Gauge, Settings, UserRound, Users, type LucideIcon } from 'lucide-react';
import type { RhArea } from '@/lib/permissions';

export interface RhNavItem {
  to: string;
  label: string;
  /** título exibido no cabeçalho */
  section: string;
  area: RhArea;
  icon: LucideIcon;
}

/** Abas do módulo de RH; cada papel só vê as suas (ver `lib/permissions`). */
export const RH_NAV_ITEMS: RhNavItem[] = [
  { to: '/rh/painel', label: 'Painel', section: 'RH — Painel da folha', area: 'painel', icon: Gauge },
  { to: '/rh/colaboradores', label: 'Colaboradores', section: 'RH — Colaboradores', area: 'colaboradores', icon: Users },
  { to: '/rh/folha', label: 'Folha', section: 'RH — Folha de pagamento', area: 'folha', icon: BriefcaseBusiness },
  { to: '/rh/documentos', label: 'Documentos', section: 'RH — Notas fiscais e comprovantes', area: 'documentos', icon: FileText },
  { to: '/rh/monitoramento', label: 'Monitoramento', section: 'RH — Monitoramento do sistema de RH', area: 'monitoramento', icon: Activity },
  { to: '/rh/meu-perfil', label: 'Meu perfil', section: 'RH — Meu perfil', area: 'meu-perfil', icon: UserRound },
];

export const RH_CONTA_ITEM = { to: '/rh/conta', label: 'Minha conta', icon: Settings };

export function rhSectionFor(pathname: string): string {
  if (pathname.startsWith('/rh/conta')) return 'RH — Minha conta';
  if (pathname.startsWith('/rh/colaboradores/')) return 'RH — Ficha do colaborador';
  if (pathname.startsWith('/rh/folha/')) return 'RH — Folha do mês';
  const item = [...RH_NAV_ITEMS].sort((a, b) => b.to.length - a.to.length).find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
  return item?.section ?? 'RH';
}
