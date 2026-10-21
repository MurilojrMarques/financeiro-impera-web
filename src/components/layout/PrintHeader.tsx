import { useLocation } from 'react-router-dom';
import { sectionFor } from '@/app/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFilters } from '@/hooks/useFilters';
import { useIntegracaoStatus } from '@/hooks/useIntegracaoStatus';
import { formatDateTime, formatRange } from '@/lib/dates';

/**
 * Cabeçalho que só existe na impressão/PDF: título, período, data de geração, critério financeiro e avisos.
 * Não inclui tokens nem dados pessoais.
 */
export function PrintHeader() {
  const { pathname } = useLocation();
  const { filters, range, compareRange } = useFilters();
  const { user } = useAuth();
  const { data: status } = useIntegracaoStatus();

  return (
    <div className="print-only mb-4 border-b border-border pb-3">
      <h1 className="text-xl font-semibold">Financeiro — {sectionFor(pathname)}</h1>
      <p className="text-sm">
        Período: {formatRange(range)}
        {compareRange && <> · Comparação: {formatRange(compareRange)}</>}
      </p>
      <p className="text-xs text-muted-foreground">
        Critério: {filters.modo === 'APROVADAS' ? 'Vendas aprovadas (status atual, como o painel Pagah)' : 'Movimentação financeira (pagamentos − perdas na data do evento)'}
        {' · '}Gerado em {formatDateTime(new Date().toISOString())} por {user?.nome}
      </p>
      {status && (
        <p className="text-xs text-muted-foreground">
          Última sincronização dos dados: {formatDateTime(status.ultimaSincronizacao)}
          {status.dadosDesatualizados && ' — ATENÇÃO: dados desatualizados; os números podem não incluir as vendas mais recentes.'}
        </p>
      )}
    </div>
  );
}
