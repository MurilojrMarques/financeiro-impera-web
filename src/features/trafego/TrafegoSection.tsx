import { SlidersHorizontal } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid, KpiGroup } from '@/components/cards/KpiGrid';
import { ComparisonIndicator } from '@/components/cards/PercentageChange';
import { ErrorState } from '@/components/feedback/ErrorState';
import { NoticeList, type NoticeItem } from '@/components/feedback/Notice';
import { ContentSection } from '@/components/layout/ContentSection';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';
import { todaySP } from '@/lib/dates';
import { formatInteger, formatPercentage } from '@/lib/formatters';
import { useFilters } from '@/hooks/useFilters';
import { trafegoService } from '@/services/trafego.service';
import type { LinhaCusto, TrafegoResumo } from '@/types/trafego.types';
import { useWithComparison } from '../shared/useComparison';
import { ParametrosDialog } from './ParametrosDialog';

const bp = (n: number | null | undefined): number | undefined => (n === null || n === undefined ? undefined : n / 100);

const negativo = (centavos: number | null, indisponivel = 'Indisponível') =>
  centavos === null ? <span className="text-muted-foreground" title="Investimento indisponível">{indisponivel}</span> : <span className="tabular whitespace-nowrap">−<CurrencyValue centavos={centavos} /></span>;

interface Conferencia {
  id: string;
  indicador: string;
  nota?: string;
  redtrack: ReactNode;
  planilha: ReactNode;
  diferenca: ReactNode;
}

const conferenciaRows = (c: TrafegoResumo['conferencia']): Conferencia[] => [
  {
    id: 'fat',
    indicador: 'Faturamento',
    redtrack: <CurrencyValue centavos={c.redtrack?.faturamentoCentavos} />,
    planilha: <CurrencyValue centavos={c.planilha.faturamentoCentavos} />,
    diferenca: (
      <span className="tabular">
        <CurrencyValue centavos={c.diferencaFaturamentoCentavos} showSign />
        {c.diferencaFaturamentoBp !== null && <span className="ml-1 text-muted-foreground">· {formatPercentage(c.diferencaFaturamentoBp / 100, 1)}</span>}
      </span>
    ),
  },
  {
    id: 'down',
    indicador: 'Downsells',
    nota: 'não entra no faturamento; só referência',
    redtrack: <CurrencyValue centavos={c.downsellsRedtrackCentavos} />,
    planilha: <span className="text-muted-foreground">—</span>,
    diferenca: <span className="text-muted-foreground">—</span>,
  },
  {
    id: 'ped',
    indicador: 'Pedidos (compras)',
    redtrack: <span className="tabular">{formatInteger(c.redtrack?.pedidos)}</span>,
    planilha: <span className="tabular">{formatInteger(c.planilha.pedidos)}</span>,
    diferenca: <span className="tabular">{c.diferencaPedidos === null ? '—' : `${c.diferencaPedidos > 0 ? '+' : ''}${formatInteger(c.diferencaPedidos)}`}</span>,
  },
];

/**
 * Tráfego (parte da página Front, como no sistema anterior): faturamento Front × investimento em anúncios × custos. Todos os valores vêm prontos da API (/trafego/resumo);
 * aqui só há apresentação. O período não aceita critério "aprovadas/movimentação": o faturamento é o bruto dos pagamentos.
 */
export function TrafegoSection() {
  const { can } = usePermissions();
  const [ajustar, setAjustar] = useState(false);
  const { range } = useFilters();
  const incluiHoje = range.ate >= todaySP();
  const q = useWithComparison('trafego', 'resumo', trafegoService.resumo, { keys: [] });
  const cur = q.current;
  const r = cur.data?.data;
  const prev = q.comparison.data?.data;
  const loading = cur.isPending;
  const cmp = (p: number | null | undefined) => (q.hasComparison ? { previous: p ?? undefined, loading: q.comparison.isPending } : undefined);
  const semInvestimento = !!r && r.investimentoCentavos === null;
  const motivo = semInvestimento ? 'Investimento do RedTrack indisponível' : undefined;

  if (cur.isError && !cur.data) {
    return <ErrorState error={cur.error} onRetry={() => void cur.refetch()} />;
  }

  const anterior = (codigo: string): LinhaCusto | undefined => prev?.linhas.find((l) => l.codigo === codigo);

  const avisos: NoticeItem[] = [
    ...(incluiHoje
      ? [{ key: 'hoje', tone: 'info' as const, content: 'O período inclui hoje, que ainda está em andamento: os números de hoje ainda vão crescer. Para fechar um dia, escolha um período que termine ontem.' }]
      : []),
    ...(r?.avisos.map((a) => ({ key: a, tone: 'warning' as const, content: a })) ?? []),
  ];

  const linhas: Column<LinhaCusto>[] = [
    {
      id: 'custo', header: 'Custo', mobile: 'title',
      cell: (l) => (
        <span className="font-medium">
          {l.nome}
          {l.rotulo && <span className="block text-[11px] font-normal text-muted-foreground">{l.rotulo}</span>}
        </span>
      ),
    },
    { id: 'como', header: 'Como é calculado', mobile: 'full', className: 'min-w-72', cell: (l) => <span className="text-xs leading-relaxed text-muted-foreground">{l.comoCalculado}</span> },
    { id: 'valor', header: 'Valor', align: 'right', mobile: 'value', cell: (l) => negativo(l.valorCentavos) },
    { id: 'pct', header: '% do faturamento', align: 'right', cell: (l) => <span className="tabular">{l.percentualFaturamentoBp === null ? '—' : formatPercentage(l.percentualFaturamentoBp / 100, 1)}</span> },
    { id: 'pedido', header: 'Por pedido', align: 'right', cell: (l) => <span className="tabular">{l.porPedidoCentavos === null ? '—' : <>−<CurrencyValue centavos={l.porPedidoCentavos} /></>}</span> },
    ...(q.hasComparison
      ? [{ id: 'vs', header: 'vs. anterior', align: 'right' as const, cell: (l: LinhaCusto) => <ComparisonIndicator current={l.valorCentavos} previous={anterior(l.codigo)?.valorCentavos} polarity="down-is-good" suffix="" /> }]
      : []),
  ];

  /** Celular: nome + valor no topo, as razões em uma linha e o "como é calculado" por último. */
  const linhaCard = (l: LinhaCusto) => (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium leading-snug">{l.nome}</p>
          {l.rotulo && <p className="text-xs text-muted-foreground">{l.rotulo}</p>}
        </div>
        <div className="shrink-0 text-right text-[15px] font-semibold leading-snug">{negativo(l.valorCentavos)}</div>
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="tabular text-foreground">{l.percentualFaturamentoBp === null ? '—' : formatPercentage(l.percentualFaturamentoBp / 100, 1)}</span> do faturamento
        </span>
        <span>
          <span className="tabular text-foreground">{l.porPedidoCentavos === null ? '—' : <>−<CurrencyValue centavos={l.porPedidoCentavos} /></>}</span> por pedido
        </span>
        {q.hasComparison && <ComparisonIndicator current={l.valorCentavos} previous={anterior(l.codigo)?.valorCentavos} polarity="down-is-good" suffix="" />}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{l.comoCalculado}</p>
    </div>
  );

  const totalDetalhe = r
    ? r.totalCustosCentavos === null
      ? 'Sem o investimento, o total não é calculado.'
      : `${formatInteger(r.remessas)} remessas · ${formatInteger(r.unidades)} unidades em ${formatInteger(r.itens)} itens`
    : '';

  const total = r && (
    <TableRow className="font-semibold hover:bg-transparent">
      <TableCell>Total dos custos</TableCell>
      <TableCell className="text-xs font-normal text-muted-foreground">{totalDetalhe}</TableCell>
      <TableCell className="text-right">{r.totalCustosCentavos === null ? <span className="font-normal text-muted-foreground">Indisponível</span> : negativo(r.totalCustosCentavos)}</TableCell>
      <TableCell className="tabular text-right">{r.totalCustosPercentualBp === null ? '—' : formatPercentage(r.totalCustosPercentualBp / 100, 1)}</TableCell>
      <TableCell className="tabular text-right">{r.totalCustosPorPedidoCentavos === null ? '—' : <>−<CurrencyValue centavos={r.totalCustosPorPedidoCentavos} /></>}</TableCell>
      {q.hasComparison && <TableCell />}
    </TableRow>
  );

  const totalCard = r && (
    <div className="px-3.5 py-3">
      <div className="flex items-start justify-between gap-3 text-[14px] font-semibold">
        <span>Total dos custos</span>
        <span className="text-[15px]">{r.totalCustosCentavos === null ? <span className="font-normal text-muted-foreground">Indisponível</span> : negativo(r.totalCustosCentavos)}</span>
      </div>
      {r.totalCustosCentavos !== null && (
        <p className="mt-1 text-xs text-muted-foreground">
          {r.totalCustosPercentualBp === null ? '—' : formatPercentage(r.totalCustosPercentualBp / 100, 1)} do faturamento · {r.totalCustosPorPedidoCentavos === null ? '—' : <>−<CurrencyValue centavos={r.totalCustosPorPedidoCentavos} /></>} por pedido
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{totalDetalhe}</p>
    </div>
  );

  const confCols: Column<Conferencia>[] = [
    {
      id: 'ind', header: <span className="sr-only">Indicador</span>, mobile: 'title',
      cell: (c) => (
        <span className="font-medium">
          {c.indicador}
          {c.nota && <span className="block text-[11px] font-normal text-muted-foreground">{c.nota}</span>}
        </span>
      ),
    },
    { id: 'red', header: 'RedTrack (referência)', align: 'right', cell: (c) => c.redtrack },
    { id: 'plan', header: 'Pagah (usado no faturamento)', align: 'right', cell: (c) => c.planilha },
    { id: 'dif', header: 'Diferença', align: 'right', cell: (c) => c.diferenca },
  ];

  return (
    <>
      <NoticeList items={avisos} />

      <KpiGroup title="Resultado do tráfego">
        <KpiGrid cols={7}>
          <KpiCard label="Faturamento" value={r?.faturamentoCentavos} loading={loading} hero comparison={cmp(prev?.faturamentoCentavos)} description="Pagah: compra + upsell + downsell, sem descontar estornos" />
          <KpiCard label="Investimento" value={r ? (r.investimentoCentavos ?? undefined) : undefined} loading={loading} unavailableReason="RedTrack indisponível ou não configurado" polarity="down-is-good" comparison={cmp(prev?.investimentoCentavos)} />
          <KpiCard label="ROAS" format="ratio" value={r ? (r.roasRedtrackCentesimos == null ? undefined : r.roasRedtrackCentesimos / 100) : undefined} loading={loading} unavailableReason="RedTrack indisponível ou não configurado" comparison={cmp(prev?.roasRedtrackCentesimos == null ? undefined : prev.roasRedtrackCentesimos / 100)} description="RedTrack: receita Front ÷ custo (o que o tráfego usa para validar oferta e criativo)" />
          <KpiCard label="ROAS Pagah" format="ratio" value={r ? (r.roasCentesimos === null ? undefined : r.roasCentesimos / 100) : undefined} loading={loading} unavailableReason={motivo} comparison={cmp(prev?.roasCentesimos == null ? undefined : prev.roasCentesimos / 100)} description="Faturamento Pagah ÷ investimento RedTrack" />
          <KpiCard label="CPA" value={r ? (r.cpaRedtrackCentavos ?? undefined) : undefined} loading={loading} unavailableReason="RedTrack indisponível ou não configurado" polarity="down-is-good" comparison={cmp(prev?.cpaRedtrackCentavos ?? undefined)} description="RedTrack: custo ÷ compras" />
          <KpiCard label="CPA Pagah" value={r ? (r.cpaCentavos ?? undefined) : undefined} loading={loading} unavailableReason={motivo} polarity="down-is-good" comparison={cmp(prev?.cpaCentavos ?? undefined)} description="Investimento ÷ pedidos Pagah" />
          <KpiCard label="Pedidos" format="integer" value={r?.pedidos} loading={loading} comparison={cmp(prev?.pedidos)} description="Compra + upsell + downsell (Pagah)" />
          <KpiCard label="Ticket médio" value={r ? (r.ticketMedioCentavos ?? undefined) : undefined} loading={loading} comparison={cmp(prev?.ticketMedioCentavos)} description="Faturamento ÷ pedidos" />
          <KpiCard
            label="MC BR"
            value={r ? (r.mcBrCentavos ?? undefined) : undefined}
            loading={loading}
            unavailableReason="RedTrack indisponível ou não configurado"
            valueTone={r?.mcBrCentavos != null && r.mcBrCentavos < 0 ? 'negative' : 'default'}
            comparison={cmp(prev?.mcBrCentavos)}
            description="(Front + Upsell 1 + Downsell 1 + Downsell 2) × 0,70 − investimento × 1,10"
          />
          <KpiCard label="Sobra do tráfego" highlight value={r ? (r.sobraCentavos ?? undefined) : undefined} loading={loading} unavailableReason={motivo} valueTone={r?.sobraCentavos != null && r.sobraCentavos < 0 ? 'negative' : 'default'} comparison={cmp(prev?.sobraCentavos)} />
          <KpiCard
            label="Margem do tráfego"
            format="percent"
            value={bp(r?.margemBp)}
            loading={loading}
            unavailableReason={motivo}
            valueTone={r?.margemBp != null ? (r.margemBp >= r.metaMargemBp ? 'positive' : 'negative') : 'default'}
            description={r ? `ideal ${formatPercentage(r.metaMargemBp / 100, 1)}` : undefined}
            comparison={cmp(bp(prev?.margemBp))}
          />
        </KpiGrid>
      </KpiGroup>

      <ContentSection
        title="Para onde vai o faturamento do tráfego"
        description={r?.margemBp != null ? `a cada R$ 100 faturados, sobram R$ ${(r.margemBp / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined}
        actions={
          can('trafego.parametros') && (
            <Button variant="outline" size="sm" onClick={() => setAjustar(true)} className="max-sm:w-full">
              <SlidersHorizontal /> Ajustar taxas e linhas
            </Button>
          )
        }
      >
        <DataTable
          caption="Custos do tráfego sobre o faturamento do período"
          columns={linhas}
          data={loading ? undefined : r?.linhas}
          loading={loading}
          rowKey={(l) => l.codigo}
          mobileCard={linhaCard}
          footer={total || undefined}
          mobileFooter={totalCard || undefined}
        />

        {r?.conferencia.redtrack && (
          <div className="space-y-2 pt-1">
            <h3 className="px-0.5 text-[13px] font-semibold">Conferência de fontes</h3>
            <DataTable caption="Conferência de fontes" columns={confCols} data={conferenciaRows(r.conferencia)} rowKey={(c) => c.id} />
          </div>
        )}
        <p className="px-0.5 text-xs leading-relaxed text-muted-foreground">
          Faturamento e pedidos vêm da Pagah (dia de Brasília, meia-noite a meia-noite); só o investimento vem do RedTrack. A conferência compara com o RedTrack: ele só enxerga vendas atribuídas a campanha. Pedidos do mesmo cliente enviados juntos contam um frete só.
        </p>
      </ContentSection>

      {can('trafego.parametros') && <ParametrosDialog open={ajustar} onOpenChange={setAjustar} />}
    </>
  );
}
