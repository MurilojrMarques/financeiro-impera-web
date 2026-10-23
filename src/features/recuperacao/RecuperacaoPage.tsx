import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid } from '@/components/cards/KpiGrid';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { FinancialBarChart } from '@/components/charts/FinancialBarChart';
import { RevenueLineChart } from '@/components/charts/RevenueLineChart';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Notice } from '@/components/feedback/Notice';
import { OutdatedDataWarning } from '@/components/feedback/OutdatedDataWarning';
import { FilterToolbar } from '@/components/filters/FilterToolbar';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageGrid, Span2 } from '@/components/layout/PageGrid';
import { useFilters } from '@/hooks/useFilters';
import { useReport } from '@/hooks/useReport';
import { formatCurrency } from '@/lib/currency';
import { dimLabel } from '@/lib/formatters';
import { recuperacaoService } from '@/services/recuperacao.service';
import type { ExtraFilterKey } from '@/types/filters.types';
import { DimensionTable } from '../shared/DimensionTable';
import { toLineSeries } from '../shared/series';
import { useWithComparison } from '../shared/useComparison';
import { VendasTable } from '../shared/VendasTable';

const KEYS: ExtraFilterKey[] = ['loja', 'produto', 'metodo'];

/**
 * Recuperação de vendas: time interno (Pedro, Edinalva, vendedores internos e CS) que vende sem a taxa de 20% do call center,
 * ou por link de vendedor no site. O grupo vem da coluna `canal` da planilha e o vendedor, do `subcanal`.
 */
export default function RecuperacaoPage() {
  const { apiParams } = useFilters();
  const params = apiParams(KEYS);

  const resumo = useWithComparison('recuperacao', 'resumo', recuperacaoService.resumo, { keys: KEYS });
  const evolucao = useReport('recuperacao', 'evolucao', recuperacaoService.evolucao, params);
  const vendedores = useReport('recuperacao', 'por-vendedor', recuperacaoService.porVendedor, params);
  const lojas = useReport('recuperacao', 'por-loja', recuperacaoService.porLoja, params);
  const produtos = useReport('recuperacao', 'por-produto', recuperacaoService.porProduto, params);
  const metodos = useReport('recuperacao', 'por-metodo', recuperacaoService.porMetodo, params);

  const cur = resumo.current;
  const r = cur.data?.data;
  const prev = resumo.comparison.data?.data;
  const cmp = (p: number | undefined) => (resumo.hasComparison ? { previous: p, loading: resumo.comparison.isPending } : undefined);
  const loading = cur.isPending;
  const refunds = r ? r.estornosCentavos + r.chargebacksCentavos : undefined;
  const prevRefunds = prev ? prev.estornosCentavos + prev.chargebacksCentavos : undefined;

  if (cur.isError && !cur.data) {
    return (
      <>
        <FilterToolbar extras={KEYS} />
        <ErrorState error={cur.error} onRetry={() => void cur.refetch()} />
      </>
    );
  }

  return (
    <>
      <FilterToolbar extras={KEYS} />
      <OutdatedDataWarning lastSync={cur.data?.meta.ultimaSincronizacao} outdated={cur.data?.meta.dadosDesatualizados} fetchFailed={cur.isError && !!cur.data} />

      <Notice tone="info" className="no-print">
        <strong className="text-foreground">Recuperação de vendas</strong> é o time interno (Pedro, Edinalva, vendedores internos e CS) que vende <strong className="text-foreground">sem a taxa de 20% do
        call center</strong>, ou por link de vendedor no site. A venda fica com quem fechou: o canal vem da planilha.
      </Notice>

      <KpiGrid cols={6}>
        <KpiCard label="Faturamento" value={r?.brutoCentavos} loading={loading} highlight hero comparison={cmp(prev?.brutoCentavos)} description={r ? `Valor sem juros dos pagamentos. Líquida após estornos: ${formatCurrency(r.receitaCentavos)}` : undefined} />
        <KpiCard label="Pedidos" format="integer" value={r?.pedidos} loading={loading} comparison={cmp(prev?.pedidos)} />
        <KpiCard label="Ticket médio" value={r?.ticketMedioCentavos} loading={loading} comparison={cmp(prev?.ticketMedioCentavos)} />
        <KpiCard label="Comissão" value={r?.comissaoCentavos} loading={loading} comparison={cmp(prev?.comissaoCentavos)} description="(Faturamento líquido × 0,70) × 5%" />
        <KpiCard label="Reembolsos" value={refunds} loading={loading} polarity="down-is-good" comparison={cmp(prevRefunds)} description={r ? `${r.estornosQtd} estornos · ${r.chargebacksQtd} chargebacks` : undefined} />
        <KpiCard label="Taxa do call center" value={r?.taxaCallCenterCentavos} loading={loading} description="Não se aplica a este canal" />
      </KpiGrid>

      <PageGrid cols={3}>
        <Span2>
          <RevenueLineChart title="Evolução do período" series={[toLineSeries('rec', 'Recuperação', 'var(--chart-5)', evolucao.data?.data)]} loading={evolucao.isPending} error={evolucao.error} onRetry={() => void evolucao.refetch()} />
        </Span2>
        <CategoryPieChart
          title="Receita por método de pagamento"
          data={(metodos.data?.data ?? []).filter((m) => m.receitaCentavos > 0).map((m) => ({ name: dimLabel(m.chave), value: m.receitaCentavos }))}
          loading={metodos.isPending}
          error={metodos.error}
          onRetry={() => void metodos.refetch()}
        />
      </PageGrid>

      <PageGrid cols={2}>
        <FinancialBarChart
          title="Receita por vendedor"
          data={(vendedores.data?.data ?? []).filter((v) => v.receitaCentavos > 0).slice(0, 8).map((v) => ({ label: dimLabel(v.chave), value: v.receitaCentavos }))}
          loading={vendedores.isPending}
          error={vendedores.error}
          onRetry={() => void vendedores.refetch()}
        />
        <ContentSection title="Por vendedor">
          <DimensionTable caption="Receita por vendedor" dimensionLabel="Vendedor" data={vendedores.data?.data} loading={vendedores.isPending} error={vendedores.error} onRetry={() => void vendedores.refetch()} limit={10} />
        </ContentSection>
      </PageGrid>

      <PageGrid cols={2} from="xl">
        <ContentSection title="Por loja"><DimensionTable caption="Receita por loja" dimensionLabel="Loja" data={lojas.data?.data} loading={lojas.isPending} error={lojas.error} onRetry={() => void lojas.refetch()} limit={10} /></ContentSection>
        <ContentSection title="Por produto"><DimensionTable caption="Receita por produto" dimensionLabel="Produto" data={produtos.data?.data} loading={produtos.isPending} error={produtos.error} onRetry={() => void produtos.refetch()} limit={10} /></ContentSection>
      </PageGrid>

      <ContentSection title="Vendas de recuperação">
        <VendasTable id="recuperacao-vendas" domain="recuperacao" resource="vendas" fetcher={recuperacaoService.vendas} title="Vendas de recuperação" keys={KEYS} />
      </ContentSection>
    </>
  );
}
