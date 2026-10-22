import { useMemo, useState } from 'react';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid, KpiGroup } from '@/components/cards/KpiGrid';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { FinancialBarChart } from '@/components/charts/FinancialBarChart';
import { RevenueLineChart } from '@/components/charts/RevenueLineChart';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OutdatedDataWarning } from '@/components/feedback/OutdatedDataWarning';
import { FilterToolbar } from '@/components/filters/FilterToolbar';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageGrid, Span2 } from '@/components/layout/PageGrid';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Segmented } from '@/components/ui/segmented';
import { useFilters } from '@/hooks/useFilters';
import { useReport } from '@/hooks/useReport';
import { dimLabel, formatInteger, formatPercentage } from '@/lib/formatters';
import { frontService } from '@/services/front.service';
import { vendasService } from '@/services/vendas.service';
import type { ExtraFilterKey } from '@/types/filters.types';
import type { DimRow } from '@/types/financial.types';
import { TrafegoSection } from '../trafego/TrafegoSection';
import { AlertsPanel } from '../shared/AlertsPanel';
import { DimensionTable } from '../shared/DimensionTable';
import { toLineSeries } from '../shared/series';
import { useWithComparison } from '../shared/useComparison';
import { VendasTable } from '../shared/VendasTable';

const KEYS: ExtraFilterKey[] = ['loja', 'produto', 'metodo', 'campanha'];
type Lista = 'todas' | 'compras' | 'upsells' | 'downsells';
const LISTAS = {
  todas: frontService.vendas,
  compras: frontService.compras,
  upsells: frontService.upsells,
  downsells: frontService.downsells,
} as const;

const topBars = (rows: DimRow[] | undefined, n = 8) =>
  (rows ?? []).filter((r) => r.receitaCentavos > 0).slice(0, n).map((r) => ({ label: dimLabel(r.chave), value: r.receitaCentavos }));

export default function FrontPage() {
  const { apiParams } = useFilters();
  const params = apiParams(KEYS);
  const [lista, setLista] = useState<Lista>('todas');

  const resumo = useWithComparison('front', 'resumo', frontService.resumo, { keys: KEYS });
  const evolucao = useReport('front', 'evolucao', frontService.evolucao, params);
  const porLoja = useReport('front', 'por-loja', frontService.porLoja, params);
  const lojaDown = useReport('front', 'por-loja#downsell', frontService.porLoja, { ...params, tipo: 'DOWNSELL' });
  const conv = useReport('front', 'conversao-upsell', frontService.conversaoUpsell, params);
  const porCampanha = useReport('front', 'por-campanha', frontService.porCampanha, params);
  const campCompra = useReport('front', 'por-campanha#compra', frontService.porCampanha, { ...params, tipo: 'COMPRA' });
  const campUpsell = useReport('front', 'por-campanha#upsell', frontService.porCampanha, { ...params, tipo: 'UPSELL' });
  const porAnuncio = useReport('front', 'por-anuncio', frontService.porAnuncio, params);
  const porProduto = useReport('front', 'por-produto', frontService.porProduto, params);
  const metodos = useReport('vendas', 'por-metodo#front', vendasService.porMetodo, { ...params, grupo: 'FRONT' });
  // /front/resumo não traz avisos: usamos os do resumo geral de vendas filtrado no grupo Front
  const avisos = useReport('vendas', 'resumo#front-avisos', vendasService.resumo, { ...params, grupo: 'FRONT' });

  const cur = resumo.current;
  const r = cur.data?.data;
  const prev = resumo.comparison.data?.data;
  const cmp = (p: number | undefined) => (resumo.hasComparison ? { previous: p, loading: resumo.comparison.isPending } : undefined);
  const loading = cur.isPending;

  // junta, por loja, os números que a API entrega em consultas separadas (sem recalcular nada)
  const lojaRows = useMemo(() => {
    const downs = new Map((lojaDown.data?.data ?? []).map((d) => [d.chave, d.pedidos]));
    const convMap = new Map((conv.data?.data.porLoja ?? []).map((c) => [c.loja, c]));
    return (porLoja.data?.data ?? []).map((l) => ({
      key: l.chave ?? '__sem__',
      loja: dimLabel(l.chave),
      compras: convMap.get(l.chave)?.pedidosCompra ?? 0,
      upsells: convMap.get(l.chave)?.pedidosUpsell ?? 0,
      pctUpsell: convMap.get(l.chave)?.conversaoUpsellPercentual ?? null,
      downsells: downs.get(l.chave) ?? 0,
      faturamento: l.receitaCentavos,
      comissao: l.comissaoCentavos,
      estimada: l.comissaoEstimadaCentavos > 0,
    }));
  }, [porLoja.data, lojaDown.data, conv.data]);

  const campanhaRows = useMemo(() => {
    const compras = new Map((campCompra.data?.data ?? []).map((c) => [c.chave, c.pedidos]));
    const ups = new Map((campUpsell.data?.data ?? []).map((c) => [c.chave, c.pedidos]));
    const totalReceita = (porCampanha.data?.data ?? []).reduce((s, c) => s + Math.max(0, c.receitaCentavos), 0);
    return (porCampanha.data?.data ?? []).map((c) => ({
      key: c.chave ?? '__sem__', campanha: dimLabel(c.chave), compras: compras.get(c.chave) ?? 0, upsells: ups.get(c.chave) ?? 0,
      receita: c.receitaCentavos, comissao: c.comissaoCentavos, estimada: c.comissaoEstimadaCentavos > 0,
      participacao: totalReceita > 0 && c.receitaCentavos > 0 ? (c.receitaCentavos / totalReceita) * 100 : null,
    }));
  }, [porCampanha.data, campCompra.data, campUpsell.data]);

  const lojaCols: Column<(typeof lojaRows)[number]>[] = [
    { id: 'loja', header: 'Loja', sortable: true, mobile: 'title', sortValue: (x) => x.loja.toLocaleLowerCase('pt-BR'), cell: (x) => <span className="font-medium">{x.loja}</span> },
    { id: 'compras', header: 'Compras', align: 'right', sortable: true, sortValue: (x) => x.compras, cell: (x) => formatInteger(x.compras) },
    { id: 'upsells', header: 'Upsells', align: 'right', sortable: true, sortValue: (x) => x.upsells, cell: (x) => formatInteger(x.upsells) },
    { id: 'pct', header: '% upsell', align: 'right', sortable: true, sortValue: (x) => x.pctUpsell, cell: (x) => formatPercentage(x.pctUpsell) },
    { id: 'downs', header: 'Downsells', align: 'right', sortable: true, sortValue: (x) => x.downsells, cell: (x) => formatInteger(x.downsells) },
    { id: 'fat', header: 'Faturamento', align: 'right', sortable: true, mobile: 'value', sortValue: (x) => x.faturamento, cell: (x) => <CurrencyValue centavos={x.faturamento} /> },
    { id: 'com', header: 'Comissão', align: 'right', sortable: true, sortValue: (x) => x.comissao, cell: (x) => <CurrencyValue centavos={x.comissao} estimated={x.estimada} /> },
  ];
  const campCols: Column<(typeof campanhaRows)[number]>[] = [
    { id: 'camp', header: 'Campanha', sortable: true, mobile: 'title', sortValue: (x) => x.campanha.toLocaleLowerCase('pt-BR'), cell: (x) => <span className="font-medium [overflow-wrap:anywhere]">{x.campanha}</span> },
    { id: 'compras', header: 'Compras', align: 'right', sortable: true, sortValue: (x) => x.compras, cell: (x) => formatInteger(x.compras) },
    { id: 'upsells', header: 'Upsells', align: 'right', sortable: true, sortValue: (x) => x.upsells, cell: (x) => formatInteger(x.upsells) },
    { id: 'rec', header: 'Receita', align: 'right', sortable: true, mobile: 'value', sortValue: (x) => x.receita, cell: (x) => <CurrencyValue centavos={x.receita} /> },
    { id: 'com', header: 'Comissão', align: 'right', sortable: true, sortValue: (x) => x.comissao, cell: (x) => <CurrencyValue centavos={x.comissao} estimated={x.estimada} /> },
    { id: 'part', header: 'Participação', align: 'right', sortable: true, sortValue: (x) => x.participacao, cell: (x) => formatPercentage(x.participacao, 1) },
  ];

  if (cur.isError && !cur.data) {
    return (<><FilterToolbar extras={KEYS} /><ErrorState error={cur.error} onRetry={() => void cur.refetch()} /></>);
  }

  const tipoData = r
    ? [
        { name: 'Compra inicial', value: r.porTipo.compras.receitaCentavos },
        { name: 'Upsell', value: r.porTipo.upsells.receitaCentavos },
        { name: 'Downsell', value: r.porTipo.downsells.receitaCentavos },
      ]
    : [];

  return (
    <>
      <FilterToolbar extras={KEYS} />
      <OutdatedDataWarning lastSync={cur.data?.meta.ultimaSincronizacao} outdated={cur.data?.meta.dadosDesatualizados} fetchFailed={cur.isError && !!cur.data} />

      <TrafegoSection />

      <KpiGroup title="Receita do Front">
        <KpiGrid cols={6}>
          <KpiCard label="Faturamento Front (Pagah)" value={r?.brutoCentavos} loading={loading} highlight hero comparison={cmp(prev?.brutoCentavos)} description="Pagamentos do período (compra + upsell + downsell), sem descontar estornos" />
          <KpiCard label="Receita líquida Front" value={r?.receitaCentavos} loading={loading} comparison={cmp(prev?.receitaCentavos)} description="Faturamento menos estornos e chargebacks do critério ativo" />
          <KpiCard label="Compras iniciais" value={r?.porTipo.compras.receitaCentavos} loading={loading} comparison={cmp(prev?.porTipo.compras.receitaCentavos)} description={r ? `${formatInteger(r.porTipo.compras.pedidos)} pedidos` : undefined} />
          <KpiCard label="Upsells" value={r?.porTipo.upsells.receitaCentavos} loading={loading} comparison={cmp(prev?.porTipo.upsells.receitaCentavos)} description={r ? `${formatInteger(r.porTipo.upsells.pedidos)} pedidos` : undefined} />
          <KpiCard label="Downsells" value={r?.porTipo.downsells.receitaCentavos} loading={loading} comparison={cmp(prev?.porTipo.downsells.receitaCentavos)} description={r ? `${formatInteger(r.porTipo.downsells.pedidos)} pedidos` : undefined} />
          <KpiCard
            label="% de upsell"
            format="percent"
            value={r ? (r.conversaoUpsell.conversaoUpsellPercentual ?? undefined) : undefined}
            unavailableReason={r && r.conversaoUpsell.conversaoUpsellPercentual === null ? 'Sem compras iniciais no período' : undefined}
            loading={loading}
            comparison={cmp(prev?.conversaoUpsell.conversaoUpsellPercentual ?? undefined)}
            description={r ? `${formatInteger(r.conversaoUpsell.pedidosUpsell)} upsells ÷ ${formatInteger(r.conversaoUpsell.pedidosCompra)} compras (mesma loja, sem afiliado)` : undefined}
          />
        </KpiGrid>
      </KpiGroup>

      <KpiGroup title="Operação">
        <KpiGrid cols={4}>
          <KpiCard label="Pedidos" format="integer" value={r?.pedidos} loading={loading} comparison={cmp(prev?.pedidos)} />
          <KpiCard label="Ticket médio" value={r?.ticketMedioCentavos} loading={loading} comparison={cmp(prev?.ticketMedioCentavos)} />
          <KpiCard
            label="Comissão"
            value={r?.comissaoCentavos}
            loading={loading}
            estimated={!!r && r.comissaoEstimadaCentavos > 0}
            comparison={cmp(prev?.comissaoCentavos)}
            description="O que a Impera recebe da Pagah: venda menos as taxas da Pagah (não é margem)"
          />
        </KpiGrid>
      </KpiGroup>

      <PageGrid cols={3}>
        <Span2>
          <RevenueLineChart title="Evolução diária do faturamento" series={[toLineSeries('front', 'Front', 'var(--chart-1)', evolucao.data?.data)]} loading={evolucao.isPending} error={evolucao.error} onRetry={() => void evolucao.refetch()} />
        </Span2>
        <CategoryPieChart title="Compra, upsell e downsell" description="Participação na receita Front" data={tipoData} loading={loading} />
      </PageGrid>

      <PageGrid cols={3} from="xl">
        <FinancialBarChart title="Receita por campanha" data={topBars(porCampanha.data?.data)} loading={porCampanha.isPending} error={porCampanha.error} onRetry={() => void porCampanha.refetch()} />
        <FinancialBarChart title="Receita por anúncio" data={topBars(porAnuncio.data?.data)} loading={porAnuncio.isPending} error={porAnuncio.error} onRetry={() => void porAnuncio.refetch()} />
        <FinancialBarChart title="Receita por loja" data={topBars(porLoja.data?.data)} loading={porLoja.isPending} error={porLoja.error} onRetry={() => void porLoja.refetch()} />
      </PageGrid>

      <PageGrid cols={2} from="xl">
        <CategoryPieChart
          title="Métodos de pagamento"
          data={(metodos.data?.data ?? []).map((m) => ({ name: dimLabel(m.chave), value: m.receitaCentavos }))}
          loading={metodos.isPending}
          error={metodos.error}
          onRetry={() => void metodos.refetch()}
        />
        <ContentSection title="Vendas por produto">
          <DimensionTable caption="Vendas por produto" dimensionLabel="Produto" data={porProduto.data?.data} loading={porProduto.isPending} error={porProduto.error} onRetry={() => void porProduto.refetch()} limit={8} />
        </ContentSection>
      </PageGrid>

      <ContentSection title="Vendas por loja" description="Compras, upsells (com % de upsell), downsells, faturamento e comissão">
        <DataTable caption="Vendas por loja" columns={lojaCols} data={lojaRows} rowKey={(x) => x.key} loading={porLoja.isPending || conv.isPending} error={porLoja.error ?? conv.error} onRetry={() => void porLoja.refetch()} initialClientSort={{ columnId: 'fat', order: 'DESC' }} dense />
      </ContentSection>

      <ContentSection title="Campanhas" description="Atribuição vem dos dados sincronizados (inclui conciliação com RedTrack). Sem custo de mídia, não há ROAS.">
        <DataTable caption="Campanhas" columns={campCols} data={campanhaRows} rowKey={(x) => x.key} loading={porCampanha.isPending} error={porCampanha.error} onRetry={() => void porCampanha.refetch()} initialClientSort={{ columnId: 'rec', order: 'DESC' }} dense />
      </ContentSection>

      <ContentSection
        title="Vendas"
        actions={<Segmented label="Tipo de venda" value={lista} onChange={setLista} options={[{ value: 'todas', label: 'Todas' }, { value: 'compras', label: 'Compras' }, { value: 'upsells', label: 'Upsells' }, { value: 'downsells', label: 'Downsells' }]} />}
      >
        <VendasTable key={lista} id={`front-${lista}`} domain="front" resource={`vendas-${lista}`} fetcher={LISTAS[lista]} title="Vendas do Front" keys={KEYS} />
      </ContentSection>

      <AlertsPanel alertas={avisos.data?.data.alertas} />
    </>
  );
}
