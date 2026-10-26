import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

/** Alterna entre Financeiro e RH. Só aparece para quem tem acesso aos dois (ex.: financeiro que também é RH). */
export function ModuleSwitch({ className }: { className?: string }) {
  const { temFinanceiro, temRh } = usePermissions();
  const { pathname } = useLocation();
  if (!temFinanceiro || !temRh) return null;
  const noRh = pathname.startsWith('/rh');
  const base = 'rounded-full px-3 py-1 text-[12px] font-medium transition-colors';
  return (
    <nav aria-label="Módulo" className={cn('no-print inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5', className)}>
      <Link to="/dashboard" aria-current={noRh ? undefined : 'page'} className={cn(base, !noRh ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}>
        Financeiro
      </Link>
      <Link to="/rh" aria-current={noRh ? 'page' : undefined} className={cn(base, noRh ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}>
        RH
      </Link>
    </nav>
  );
}
