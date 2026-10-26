import { EmImplementacao } from '@/components/feedback/EmImplementacao';
import { useNavigate } from 'react-router-dom';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { GROUP_COLORS } from '@/components/charts/chart-utils';
import { RevenueDistributionChart } from '@/components/charts/RevenueDistributionChart';
import { RevenueLineChart } from '@/components/charts/RevenueLineChart';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OutdatedDataWarning } from '@/components/feedback/OutdatedDataWarning';
import { FilterToolbar } from '@/components/filters/FilterToolbar';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageGrid, Span2 } from '@/components/layout/PageGrid';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableCell, TableRow } from '@/components/ui/table';
import { useFilters } from '@/hooks/useFilters';
import { useIntegracaoStatus } from '@/hooks/useIntegracaoStatus';
import { usePermissions } from '@/hooks/usePermissions';
import { useReport } from '@/hooks/useReport';
import { formatInteger, grupoLabel } from '@/lib/formatters';
import { afiliadosService } from '@/services/afiliados.service';
import { backendService } from '@/services/backend.service';
import { callCenterService } from '@/services/call-center.service';
import { dashboardService } from '@/services/dashboard.service';
import { recuperacaoService } from '@/services/recuperacao.service';
import { frontService } from '@/services/front.service';
import { vendasService } from '@/services/vendas.service';
import type { ExtraFilterKey } from '@/types/filters.types';
import type { AfiliadoRanking, GrupoReceita } from '@/types/financial.types';
import { AlertsPanel } from '../shared/AlertsPanel';
import { DimensionTable } from '../shared/DimensionTable';
import { toLineSeries } from '../shared/series';
import { useWithComparison } from '../shared/useComparison';
import { VendasTable } from '../shared/VendasTable';
import { KpiSection } from './KpiSection';

const KEYS: ExtraFilterKey[] = ['loja', 'grupo', 'metodo'];

export default function DashboardPage() {
  const { apiParams } = useFilters();
  const { canAccess } = usePermissions();
  const navigate = useNavigate();
  const { data: sync } = useIntegracaoStatus();
  const params = apiParams(KEYS);
  const analista = canAccess('front'); // ANALISTA+ enxerga os detalhes por módulo

  const resumo = useWithComparison('dashboard', 'resumo', dashboardService.resumo, { keys: KEYS });
  const total = useReport('dashboard', 'evolucao', dashboardService.evolucao, params);
  const front = useReport('front', 'evolucao', frontService.evolucao, params, { enabled: analista });
  const back = useReport('backend', 'evolucao', backendService.evolucao, params, { enabled: analista });
  const cc = useReport('call-center', 'evolucao', callCenterService.evolucao, params, { enabled: analista });
  const recup = useReport('recuperacao', 'evolucao', recuperacaoService.evolucao, params, { enabled: analista });
  const afil = useReport('afiliados', 'evolucao', afiliadosService.evolucao, params, { enabled: analista });
  const trafego = useReport('dashboard', 'trafego', dashboardService.trafego, params, { enabled: analista });
  const distrib = useReport('dashboard', 'distribuicao', dashboardService.distribuicao, params);
  const lojas = useReport('dashboard', 'receitas-por-loja', dashboardService.receitasPorLoja, params);
  const produtos = useReport('vendas', 'por-produto', vendasService.porProduto, params, { enabled: analista });
  const ranking = useReport('afiliados', 'ranking', afiliadosService.ranking, { ...params, limit: 10 }, { enabled: analista });

  const cur = resumo.current;
  const kpis = cur.data?.data.kpis;
  const grupos = cur.data?.data.receitasPorGrupo;
  const meta = cur.data?.meta;

  const series = [
    toLineSeries('total', 'Receita', 'var(--foreground)', total.data?.data),
    ...(analista
      ? [
          toLineSeries('front', 'Front', GROUP_COLORS.FRONT, front.data?.data),
          toLineSeries('back', 'Back-end Outros', GROUP_COLORS.BACKEND_OUTROS, back.data?.data),
          toLineSeries('cc', 'Call Center', GROUP_COLORS.CALL_CENTER, cc.data?.data),
          toLineSeries('rec', 'Recuperação', GROUP_COLORS.RECUPERACAO, recup.data?.data),
          toLineSeries('afil', 'Afiliados', GROUP_COLORS.AFILIADO, afil.data?.data),
        ]
      : []),
  ];
  const seriesLoading = total.isPending || (analista && (front.isPending || back.isPending || cc.isPending || recup.isPending || afil.isPending));
  const seriesError = total.error ?? front.error ?? back.error ?? cc.error ?? recup.error ?? afil.error;

  if (cur.isError && !cur.data) {
    return (
      <>
        <FilterToolbar extras={KEYS} />
        <ErrorState error={cur.error} onRetry={() => void cur.refetch()} />
      </>
    );
  }

  const grupoRows = grupos
    ? ([
        ['FRONT', grupos.grupos.front],
        ['BACKEND_OUTROS', grupos.grupos.backendOutros],
        ['CALL_CENTER', grupos.grupos.callCenter],
        ['RECUPERACAO', grupos.grupos.recuperacao],
        ['AFILIADO', grupos.grupos.afiliados],
        ['NAO_CLASSIFICADA', grupos.grupos.naoClassificadas],
      ] as [GrupoReceita, (typeof grupos.geral)][]).map(([g, m]) => ({ id: g, nome: grupoLabel(g), m }))
    : undefined;

  const grupoColumns: Column<NonNullable<typeof grupoRows>[number]>[] = [
    { id: 'grupo', header: 'Grupo', mobile: 'title', cell: (r) => <span className="font-medium">{r.nome}</span> },
    { id: 'pedidos', header: 'Pedidos', align: 'right', cell: (r) => formatInteger(r.m.pedidos) },
    { id: 'receita', header: 'Receita', align: 'right', mobile: 'value', cell: (r) => <CurrencyValue centavos={r.m.receitaCentavos} /> },
    { id: 'comissao', header: 'Comissão', align: 'right', cell: (r) => (r.id === 'CALL_CENTER' || r.id === 'RECUPERACAO' ? <CurrencyValue centavos={r.m.comissaoCentavos} /> : r.id === 'FRONT' && trafego.data?.data.comissaoFrontCentavos != null ? <CurrencyValue centavos={trafego.data.data.comissaoFrontCentavos} /> : r.id === 'AFILIADO' ? <CurrencyValue centavos={r.m.comissaoAfiliadoCentavos} /> : r.id === 'BACKEND_OUTROS' ? <span className="text-muted-foreground">—</span> : <EmImplementacao />) },
    { id: 'ticket', header: 'Ticket médio', align: 'right', cell: (r) => <CurrencyValue centavos={r.m.ticketMedioCentavos} /> },
  ];

  const rankingColumns: Column<AfiliadoRanking>[] = [
    { id: 'pos', header: '#', mobile: 'hidden', cell: (r) => r.posicao },
    {
      id: 'nome', header: 'Afiliado', mobile: 'title',
      cell: (r) => (
        <span className="font-medium">
          <span className="mr-1.5 text-muted-foreground md:hidden">{r.posicao}.</span>
          {r.nome}
        </span>
      ),
    },
    { id: 'pedidos', header: 'Pedidos', align: 'right', cell: (r) => formatInteger(r.pedidos) },
    { id: 'fat', header: 'Faturamento', align: 'right', mobile: 'value', cell: (r) => <CurrencyValue centavos={r.faturamentoCentavos} /> },
    { id: 'com', header: 'Comissão', align: 'right', cell: () => <EmImplementacao /> },
  ];

  const grupoSection = (
    <ContentSection title="Receita por grupo" description="Grupos mutuamente exclusivos; Back-end Total é um agregado">
      <DataTable
        caption="Receita por grupo"
        columns={grupoColumns}
        data={grupoRows}
        rowKey={(r) => r.id}
        loading={cur.isPending}
        dense
        footer={
          grupos && (
            <TableRow className="hover:bg-transparent">
              <TableCell className="text-xs font-normal text-muted-foreground" colSpan={5}>
                Back-end Total (Back-end Outros + Call Center, agregado, não somado ao total): <CurrencyValue centavos={grupos.backendTotal.receitaCentavos} className="font-medium text-foreground" />
              </TableCell>
            </TableRow>
          )
        }
      />
    </ContentSection>
  );

  return (
    <>
      <FilterToolbar extras={KEYS} />
      <OutdatedDataWarning
        lastSync={meta?.ultimaSincronizacao ?? sync?.ultimaSincronizacao}
        outdated={meta?.dadosDesatualizados ?? sync?.dadosDesatualizados}
        fetchFailed={cur.isError && !!cur.data}
      />

      <KpiSection
        trafego={analista ? { loading: trafego.isPending, data: trafego.data?.data } : undefined}
        kpis={kpis}
        previous={resumo.comparison.data?.data.kpis}
        loading={cur.isPending}
        hasComparison={resumo.hasComparison}
        comparisonLoading={resumo.comparison.isPending}
      />

      <PageGrid cols={3}>
        <Span2>
          <RevenueLineChart title="Evolução da receita" description="Receita diária por grupo" series={series} loading={seriesLoading} error={seriesError} onRetry={() => void total.refetch()} />
        </Span2>
        <RevenueDistributionChart distribuicao={distrib.data?.data} loading={distrib.isPending} error={distrib.error} onRetry={() => void distrib.refetch()} />
      </PageGrid>

      {/* tabelas de tamanho parecido lado a lado (loja ↔ produtos; grupo ↔ afiliados): sem vazio ao lado da mais curta */}
      <PageGrid cols={2} from="xl">
        <ContentSection title="Receita por loja">
          <DimensionTable caption="Receita por loja" dimensionLabel="Loja" data={lojas.data?.data} loading={lojas.isPending} error={lojas.error} onRetry={() => void lojas.refetch()} limit={10} />
        </ContentSection>
        {analista && (
          <ContentSection title="Principais produtos">
            <DimensionTable caption="Principais produtos" dimensionLabel="Produto" data={produtos.data?.data} loading={produtos.isPending} error={produtos.error} onRetry={() => void produtos.refetch()} limit={10} />
          </ContentSection>
        )}
        {!analista && grupoSection}
      </PageGrid>

      {analista && (
        <PageGrid cols={2} from="xl">
          {grupoSection}
          <ContentSection title="Principais afiliados" description="Ranking por faturamento no período">
            <DataTable
              caption="Principais afiliados"
              columns={rankingColumns}
              data={ranking.data?.data}
              rowKey={(r) => r.id}
              loading={ranking.isPending}
              error={ranking.error}
              onRetry={() => void ranking.refetch()}
              onRowClick={(r) => navigate(`/afiliados/${r.id}`)}
              empty={{ title: 'Nenhum afiliado possui vendas no período selecionado.' }}
              dense
            />
          </ContentSection>
        </PageGrid>
      )}

      {analista && (
        <ContentSection title="Últimas movimentações" description="Vendas pagas mais recentes do período (perdas estão em Reembolsos)">
          <VendasTable id="ultimas" domain="vendas" resource="ultimas" fetcher={vendasService.listar} title="Últimas vendas pagas" keys={KEYS} defaultLimit={10} />
        </ContentSection>
      )}

      <AlertsPanel alertas={cur.data?.data.alertas} />
    </>
  );
}
