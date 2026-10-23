import { EmImplementacao } from '@/components/feedback/EmImplementacao';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { useTableState } from '@/hooks/useTableState';
import { useFilters } from '@/hooks/useFilters';
import { usePagedReport } from '@/hooks/useReport';
import { formatDateTime } from '@/lib/dates';
import { statusLabel, tipoVendaLabel } from '@/lib/formatters';
import type { Params } from '@/lib/query-keys';
import type { PagedResult } from '@/types/api.types';
import type { ExtraFilterKey } from '@/types/filters.types';
import type { VendaItem } from '@/types/financial.types';

type Fetcher = (params: Params, signal: AbortSignal) => Promise<PagedResult<VendaItem>>;

const STATUS_VARIANT = { PAGO: 'positive', ESTORNADO: 'warning', CHARGEBACK: 'negative', PENDENTE_CONCILIACAO: 'info' } as const;

interface Props {
  /** id único da tabela (prefixo dos parâmetros de URL) */
  id: string;
  domain: string;
  resource: string;
  fetcher: Fetcher;
  title: string;
  /** parâmetros fixos adicionais (ex.: tipo) */
  fixed?: Params;
  keys?: readonly ExtraFilterKey[];
  /** colunas opcionais */
  showAttendant?: boolean;
  showAffiliate?: boolean;
  showLoss?: boolean;
  defaultLimit?: number;
  onRowClick?: (v: VendaItem) => void;
}

/** Lista paginada de vendas: paginação, ordenação e filtros no SERVIDOR; estado na URL. */
export function VendasTable({ id, domain, resource, fetcher, title, fixed, keys, showAttendant, showAffiliate, showLoss, defaultLimit, onRowClick }: Props) {
  const { apiParams } = useFilters();
  const { state, update } = useTableState(id, { sortBy: showLoss ? 'perdaEm' : 'pagoEm', sortOrder: 'DESC', limit: defaultLimit });
  const params: Params = { ...apiParams(keys), ...fixed, page: state.page, limit: state.limit, sortBy: state.sortBy, sortOrder: state.sortOrder };
  const q = usePagedReport(domain, resource, fetcher, params, { autoRefresh: false });

  const data = (v: VendaItem) => (showLoss ? formatDateTime(v.perdaEm) : formatDateTime(v.pagoEm));

  const columns: Column<VendaItem>[] = [
    { id: 'pedido', header: 'Pedido', sortable: true, sortKey: 'pedido', cell: (v) => <span className="font-mono text-xs">{v.pedido}</span> },
    {
      id: 'data', header: showLoss ? 'Perda em' : 'Pago em', sortable: true, sortKey: showLoss ? 'perdaEm' : 'pagoEm',
      cell: (v) => <span className="whitespace-nowrap">{data(v)}</span>,
    },
    { id: 'loja', header: 'Loja', cell: (v) => v.loja ?? '—' },
    { id: 'produto', header: 'Produto', cell: (v) => <span className="block max-w-56 truncate" title={v.kitNome ?? undefined}>{v.kitNome ?? '—'}</span> },
    { id: 'tipo', header: 'Tipo', cell: (v) => tipoVendaLabel(v.tipoVenda) },
    { id: 'pagamento', header: 'Pagamento', cell: (v) => v.metodoPagamento ?? '—' },
    ...(showAttendant ? [{ id: 'atendente', header: 'Atendente', cell: (v: VendaItem) => v.atendente ?? v.origem ?? '—' }] : []),
    ...(showAffiliate ? [{ id: 'afiliado', header: 'Afiliado', cell: (v: VendaItem) => v.afiliado?.nome ?? '—' }] : []),
    { id: 'valor', header: 'Valor', align: 'right', sortable: true, sortKey: 'valorVendaCentavos', cell: (v) => <CurrencyValue centavos={v.valorVendaCentavos} /> },
    ...(showLoss ? [{ id: 'perda', header: 'Perda', align: 'right' as const, cell: (v: VendaItem) => <CurrencyValue centavos={v.perdaCentavos} /> }] : []),
    {
      id: 'comissao', header: 'Comissão', align: 'right',
      cell: (v) => (
        v.grupo === 'CALL_CENTER' || v.grupo === 'RECUPERACAO' ? <CurrencyValue centavos={v.comissaoCentavos} /> : <EmImplementacao />
      ),
    },
    { id: 'status', header: 'Status', sortable: true, sortKey: 'status', cell: (v) => <Badge variant={STATUS_VARIANT[v.status]}>{statusLabel(v.status)}</Badge> },
  ];

  /** Celular: um cartão enxuto por venda (pedido + produto + valor + status; o resto em linhas de apoio). */
  const card = (v: VendaItem) => (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">#{v.pedido}</p>
          <p className="mt-0.5 text-[14px] font-medium leading-snug [overflow-wrap:anywhere]">{v.kitNome ?? '—'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-semibold leading-snug tabular">
            <CurrencyValue centavos={v.valorVendaCentavos} />
          </p>
          <Badge variant={STATUS_VARIANT[v.status]} className="mt-1.5">{statusLabel(v.status)}</Badge>
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {data(v)} · {v.loja ?? '—'} · {tipoVendaLabel(v.tipoVenda)}
        {v.metodoPagamento ? ` · ${v.metodoPagamento}` : ''}
        {showAttendant && (v.atendente ?? v.origem) ? ` · ${v.atendente ?? v.origem}` : ''}
        {showAffiliate && v.afiliado ? ` · ${v.afiliado.nome}` : ''}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        {showLoss && (
          <>
            Perda: <CurrencyValue centavos={v.perdaCentavos} className="text-foreground" /> ·
          </>
        )}
        Comissão: {v.grupo === 'CALL_CENTER' || v.grupo === 'RECUPERACAO' ? <CurrencyValue centavos={v.comissaoCentavos} className="text-foreground" /> : <EmImplementacao />}
      </p>
    </div>
  );

  const meta = q.data?.meta;
  return (
    <DataTable
      caption={title}
      columns={columns}
      data={q.data?.data}
      rowKey={(v) => v.pedido}
      loading={q.isPending}
      fetching={q.isFetching && !q.isPending}
      error={q.error}
      onRetry={() => void q.refetch()}
      serverSort={{ sortBy: state.sortBy, sortOrder: state.sortOrder, onChange: (sortBy, sortOrder) => update({ sortBy, sortOrder }) }}
      onRowClick={onRowClick}
      mobileCard={card}
      pagination={
        meta && {
          page: meta.page, limit: meta.limit, total: meta.total, totalPages: meta.totalPages,
          onPageChange: (page) => update({ page }), onLimitChange: (limit) => update({ limit }),
        }
      }
      empty={{ title: 'Nenhuma venda encontrada para este período.', description: 'Ajuste o período ou os filtros.' }}
    />
  );
}
