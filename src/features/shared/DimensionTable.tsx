import { useState } from 'react';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dimLabel, formatInteger, formatPercentage } from '@/lib/formatters';
import type { DimRow, MetricasFormatadas } from '@/types/financial.types';

type Row = MetricasFormatadas & { chave: string | null; id?: string };

interface Props<T extends Row = DimRow> {
  caption: string;
  /** nome da primeira coluna: Loja, Produto, Campanha... */
  dimensionLabel: string;
  data: T[] | undefined;
  loading?: boolean;
  fetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** mostra Comissão / Estornos */
  showCommission?: boolean;
  showRefunds?: boolean;
  /** formata o nome (ex.: categorias de recuperação) */
  nameOf?: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** linhas exibidas antes de "Ver todas" (padrão 10, ordem da API = maior receita primeiro) */
  limit?: number;
  emptyDescription?: string;
}

/** Receita com a participação logo abaixo (barra + %): uma coluna a menos e a comparação entre linhas à vista. */
function ShareCell({ row, pct }: { row: MetricasFormatadas; pct: number | null }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <CurrencyValue centavos={row.receitaCentavos} />
      {pct !== null && (
        <div className="flex w-full max-w-28 items-center gap-1.5" title={`${formatPercentage(pct, 1)} da receita listada`}>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
          </div>
          <span className="tabular w-11 shrink-0 text-right text-[11px] text-muted-foreground">{formatPercentage(pct, 1)}</span>
        </div>
      )}
    </div>
  );
}

/** Tabela de agrupamento (por loja/produto/campanha/...) com ordenação local e participação na receita listada. */
export function DimensionTable<T extends Row = DimRow>({
  caption, dimensionLabel, data, loading, fetching, error, onRetry, showCommission = true, showRefunds = false, nameOf, onRowClick, limit, emptyDescription,
}: Props<T>) {
  const [expandido, setExpandido] = useState(false);
  const corte = limit ?? 10;
  const excede = !!data && data.length > corte;
  const rows = data && excede && !expandido ? data.slice(0, corte) : data;
  // participação = parte da soma das linhas EXIBIDAS (apenas apresentação; totais oficiais vêm dos cards)
  const totalReceita = (rows ?? []).reduce((s, r) => s + Math.max(0, r.receitaCentavos), 0);
  const name = (r: T) => (nameOf ? nameOf(r) : dimLabel(r.chave));
  const share = (r: T) => (totalReceita > 0 && r.receitaCentavos > 0 ? (r.receitaCentavos / totalReceita) * 100 : null);

  const columns: Column<T>[] = [
    {
      id: 'nome', header: dimensionLabel, sortable: true, mobile: 'title', sortValue: (r) => name(r).toLocaleLowerCase('pt-BR'),
      cell: (r) => (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium [overflow-wrap:anywhere]">{name(r)}</span>
          {r.chave === null && !nameOf && <Badge title="Valor não informado na origem">sem origem</Badge>}
        </span>
      ),
    },
    { id: 'pedidos', header: 'Pedidos', align: 'right', sortable: true, sortValue: (r) => r.pedidos, cell: (r) => formatInteger(r.pedidos) },
    { id: 'receita', header: 'Receita', align: 'right', sortable: true, mobile: 'value', sortValue: (r) => r.receitaCentavos, cell: (r) => <ShareCell row={r} pct={share(r)} /> },
    ...(showCommission
      ? [{ id: 'comissao', header: 'Comissão', align: 'right' as const, sortable: true, sortValue: (r: T) => r.comissaoCentavos, cell: (r: T) => <CurrencyValue centavos={r.comissaoCentavos} estimated={r.comissaoEstimadaCentavos > 0} /> }]
      : []),
    ...(showRefunds
      ? [{ id: 'reembolsos', header: 'Reembolsos', align: 'right' as const, sortable: true, sortValue: (r: T) => r.estornosCentavos + r.chargebacksCentavos, cell: (r: T) => <CurrencyValue centavos={r.estornosCentavos + r.chargebacksCentavos} /> }]
      : []),
    { id: 'ticket', header: 'Ticket médio', align: 'right', sortable: true, sortValue: (r) => r.ticketMedioCentavos, cell: (r) => <CurrencyValue centavos={r.ticketMedioCentavos} /> },
  ];

  return (
    <DataTable
      caption={caption}
      columns={columns}
      data={rows}
      rowKey={(r) => r.id ?? r.chave ?? '__sem_valor__'}
      loading={loading}
      fetching={fetching}
      error={error}
      onRetry={onRetry}
      initialClientSort={{ columnId: 'receita', order: 'DESC' }}
      onRowClick={onRowClick}
      empty={{ title: 'Nenhum dado para o período', description: emptyDescription }}
      dense
      bodyFooter={
        excede && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground">
            <span>{expandido ? `Mostrando todas as ${data.length} linhas` : `Mostrando as ${corte} maiores de ${data.length}`}</span>
            <Button variant="ghost" size="sm" onClick={() => setExpandido((v) => !v)} aria-expanded={expandido}>
              {expandido ? 'Mostrar menos' : `Ver todas (${data.length})`}
            </Button>
          </div>
        )
      }
    />
  );
}
