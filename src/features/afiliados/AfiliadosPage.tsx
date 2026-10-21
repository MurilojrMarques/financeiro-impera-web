import { useNavigate } from 'react-router-dom';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid } from '@/components/cards/KpiGrid';
import { FinancialBarChart } from '@/components/charts/FinancialBarChart';
import { RevenueLineChart } from '@/components/charts/RevenueLineChart';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OutdatedDataWarning } from '@/components/feedback/OutdatedDataWarning';
import { FilterToolbar } from '@/components/filters/FilterToolbar';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageGrid, Span2 } from '@/components/layout/PageGrid';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableSearch } from '@/components/tables/TableSearch';
import { useFilters } from '@/hooks/useFilters';
import { usePagedReport, useReport } from '@/hooks/useReport';
import { useTableState } from '@/hooks/useTableState';
import { dimLabel, formatInteger, formatPercentage } from '@/lib/formatters';
import { afiliadosService } from '@/services/afiliados.service';
import { dashboardService } from '@/services/dashboard.service';
import type { ExtraFilterKey } from '@/types/filters.types';
import type { AfiliadoItem } from '@/types/financial.types';
import { toLineSeries } from '../shared/series';
import { useWithComparison } from '../shared/useComparison';

const KEYS: ExtraFilterKey[] = ['loja', 'metodo', 'status'];

export default function AfiliadosPage() {
  const { apiParams } = useFilters();
  const navigate = useNavigate();
  const params = apiParams(KEYS);
  const { state, update } = useTableState('afil', { limit: 50 });

  const resumo = useWithComparison('afiliados', 'resumo', afiliadosService.resumo, { keys: KEYS });
  const evolucao = useReport('afiliados', 'evolucao', afiliadosService.evolucao, params);
  const porLoja = useReport('afiliados', 'por-loja', afiliadosService.porLoja, params);
  const distrib = useReport('dashboard', 'distribuicao', dashboardService.distribuicao, apiParams(['loja', 'metodo']));
  const lista = usePagedReport('afiliados', 'lista', afiliadosService.listar, { ...params, nome: state.busca, page: state.page, limit: state.limit });

  const cur = resumo.current;
  const r = cur.data?.data;
  const prev = resumo.comparison.data?.data;
  const cmp = (p: number | undefined) => (resumo.hasComparison ? { previous: p, loading: resumo.comparison.isPending } : undefined);
  const loading = cur.isPending;
  const refunds = r ? r.estornosCentavos + r.chargebacksCentavos : undefined;
  const prevRefunds = prev ? prev.estornosCentavos + prev.chargebacksCentavos : undefined;
  const participacao = distrib.data?.data.distribuicao.find((d) => d.grupo === 'AFILIADO')?.participacaoPercentual;

  // participação do afiliado = parte do faturamento do grupo (razão de apresentação sobre o total oficial do resumo)
  const totalGrupo = r?.brutoCentavos ?? 0;

  const columns: Column<AfiliadoItem>[] = [
    {
      id: 'nome', header: 'Afiliado', sortable: true, mobile: 'title', sortValue: (a) => a.nome.toLocaleLowerCase('pt-BR'),
      cell: (a) => <span className="font-medium [overflow-wrap:anywhere]">{a.nome}</span>,
    },
    { id: 'pedidos', header: 'Pedidos', align: 'right', sortable: true, sortValue: (a) => a.pedidos, cell: (a) => formatInteger(a.pedidos) },
    { id: 'fat', header: 'Faturamento', align: 'right', sortable: true, mobile: 'value', sortValue: (a) => a.faturamentoCentavos, cell: (a) => <CurrencyValue centavos={a.faturamentoCentavos} /> },
    { id: 'com', header: 'Comissão do afiliado', align: 'right', sortable: true, sortValue: (a) => a.comissaoCentavos, cell: (a) => <CurrencyValue centavos={a.comissaoCentavos} /> },
    { id: 'ticket', header: 'Ticket médio', align: 'right', sortable: true, sortValue: (a) => a.ticketMedioCentavos, cell: (a) => <CurrencyValue centavos={a.ticketMedioCentavos} /> },
    { id: 'reemb', header: 'Reembolsos', align: 'right', sortable: true, sortValue: (a) => a.reembolsosCentavos, cell: (a) => <CurrencyValue centavos={a.reembolsosCentavos} /> },
    { id: 'part', header: 'Participação', align: 'right', sortable: true, sortValue: (a) => a.faturamentoCentavos, cell: (a) => (totalGrupo > 0 ? formatPercentage((a.faturamentoCentavos / totalGrupo) * 100, 1) : '—') },
  ];

  // posição segue o faturamento retornado pela API (ordem do ranking)
  const ranked = (lista.data?.data ?? []).map((a, i) => ({ ...a, pos: (state.page - 1) * state.limit + i + 1 }));
  const columnsComPos: Column<(typeof ranked)[number]>[] = [{ id: 'pos', header: '#', mobile: 'hidden', cell: (a) => a.pos }, ...(columns as unknown as Column<(typeof ranked)[number]>[])];

  if (cur.isError && !cur.data) {
    return (<><FilterToolbar extras={KEYS} /><ErrorState error={cur.error} onRetry={() => void cur.refetch()} /></>);
  }

  return (
    <>
      <FilterToolbar extras={KEYS} />
      <OutdatedDataWarning lastSync={cur.data?.meta.ultimaSincronizacao} outdated={cur.data?.meta.dadosDesatualizados} fetchFailed={cur.isError && !!cur.data} />

      <KpiGrid cols={4}>
        <KpiCard label="Receita dos afiliados" value={r?.receitaCentavos} loading={loading} highlight hero comparison={cmp(prev?.receitaCentavos)} />
        <KpiCard label="Pedidos" format="integer" value={r?.pedidos} loading={loading} comparison={cmp(prev?.pedidos)} />
        <KpiCard label="Ticket médio" value={r?.ticketMedioCentavos} loading={loading} comparison={cmp(prev?.ticketMedioCentavos)} />
        <KpiCard label="Comissão dos afiliados" value={r?.comissaoAfiliadoCentavos} loading={loading} estimated={!!r && r.comissaoAfiliadoEstimadaCentavos > 0} comparison={cmp(prev?.comissaoAfiliadoCentavos)} description="O que os afiliados recebem (não é a comissão da Impera)" />
        <KpiCard label="Afiliados ativos" format="integer" value={r?.afiliadosAtivos} loading={loading} comparison={cmp(prev?.afiliadosAtivos)} description="Com vendas no período" />
        <KpiCard label="Reembolsos" value={refunds} loading={loading} polarity="down-is-good" comparison={cmp(prevRefunds)} />
        <KpiCard label="Comissão da operação" value={r?.comissaoCentavos} loading={loading} comparison={cmp(prev?.comissaoCentavos)} description="Comissão da Impera nos pedidos de afiliados" />
        <KpiCard label="Participação no faturamento" format="percent" value={participacao ?? undefined} loading={distrib.isPending} unavailableReason={participacao === null ? 'Sem receita no período' : undefined} description="Parcela da receita total" />
      </KpiGrid>

      <PageGrid cols={3}>
        <Span2>
          <RevenueLineChart title="Evolução diária dos afiliados" series={[toLineSeries('af', 'Afiliados', 'var(--chart-4)', evolucao.data?.data)]} loading={evolucao.isPending} error={evolucao.error} onRetry={() => void evolucao.refetch()} />
        </Span2>
        <FinancialBarChart title="Receita por loja" data={(porLoja.data?.data ?? []).filter((x) => x.receitaCentavos > 0).slice(0, 8).map((x) => ({ label: dimLabel(x.chave), value: x.receitaCentavos }))} loading={porLoja.isPending} error={porLoja.error} onRetry={() => void porLoja.refetch()} />
      </PageGrid>

      <ContentSection
        title="Ranking de afiliados"
        description="Cada afiliado é identificado pelo nome recebido da planilha (variações de acento/caixa são unidas; nomes parecidos continuam separados). Clique para ver o detalhe."
        actions={<TableSearch value={state.busca} onChange={(busca) => update({ busca })} placeholder="Buscar afiliado…" label="Buscar afiliado por nome" />}
      >
        <DataTable
          caption="Ranking de afiliados"
          columns={columnsComPos}
          data={ranked}
          rowKey={(a) => a.id}
          loading={lista.isPending}
          fetching={lista.isFetching && !lista.isPending}
          error={lista.error}
          onRetry={() => void lista.refetch()}
          initialClientSort={{ columnId: 'fat', order: 'DESC' }}
          onRowClick={(a) => navigate(`/afiliados/${a.id}`)}
          empty={{ title: state.busca ? 'Nenhum afiliado encontrado para esta busca.' : 'Nenhum afiliado possui vendas no período selecionado.' }}
          pagination={
            lista.data && {
              page: lista.data.meta.page, limit: lista.data.meta.limit, total: lista.data.meta.total, totalPages: lista.data.meta.totalPages,
              onPageChange: (page) => update({ page }), onLimitChange: (limit) => update({ limit }),
            }
          }
        />
      </ContentSection>
    </>
  );
}
