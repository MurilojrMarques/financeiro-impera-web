import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { useFilters } from '@/hooks/useFilters';
import { useReport } from '@/hooks/useReport';
import { dimLabel, formatInteger, formatPercentage, grupoLabel } from '@/lib/formatters';
import { reembolsosService } from '@/services/reembolsos.service';
import type { ExtraFilterKey } from '@/types/filters.types';
import { toLineSeries } from '../shared/series';
import { useWithComparison } from '../shared/useComparison';
import { VendasTable } from '../shared/VendasTable';

const KEYS: ExtraFilterKey[] = ['loja', 'metodo', 'grupo'];
type Visao = 'todos' | 'estornos' | 'chargebacks';
const LISTAS = { todos: reembolsosService.listar, estornos: reembolsosService.estornos, chargebacks: reembolsosService.chargebacks } as const;

/**
 * Perdas (estorno/chargeback). A regra "uma perda por pedido" é do backend: quando estorno e chargeback são o mesmo
 * reembolso, conta-se uma vez (como chargeback) e os dois eventos ficam preservados para auditoria.
 */
export default function ReembolsosPage() {
  const { apiParams } = useFilters();
  const params = apiParams(KEYS);
  const [visao, setVisao] = useState<Visao>('todos');

  const resumo = useWithComparison('reembolsos', 'resumo', reembolsosService.resumo, { keys: KEYS });
  const evolucao = useReport('reembolsos', 'evolucao', reembolsosService.evolucao, params);
  const porLoja = useReport('reembolsos', 'por-loja', reembolsosService.porLoja, params);
  const porGrupo = useReport('reembolsos', 'por-grupo', reembolsosService.porGrupo, params);

  const cur = resumo.current;
  const r = cur.data?.data;
  const prev = resumo.comparison.data?.data;
  const cmp = (p: number | undefined) => (resumo.hasComparison ? { previous: p, loading: resumo.comparison.isPending } : undefined);
  const loading = cur.isPending;

  // razão de apresentação entre dois totais oficiais (perdas ÷ faturamento bruto pago)
  const taxa = r && r.brutoCentavos > 0 ? ((r.estornosCentavos + r.chargebacksCentavos) / r.brutoCentavos) * 100 : undefined;
  const taxaPrev = prev && prev.brutoCentavos > 0 ? ((prev.estornosCentavos + prev.chargebacksCentavos) / prev.brutoCentavos) * 100 : undefined;

  if (cur.isError && !cur.data) {
    return (<><FilterToolbar extras={KEYS} /><ErrorState error={cur.error} onRetry={() => void cur.refetch()} /></>);
  }

  return (
    <>
      <FilterToolbar extras={KEYS} />
      <OutdatedDataWarning lastSync={cur.data?.meta.ultimaSincronizacao} outdated={cur.data?.meta.dadosDesatualizados} fetchFailed={cur.isError && !!cur.data} />

      <KpiGrid cols={6}>
        <KpiCard label="Estornos" value={r?.estornosCentavos} loading={loading} polarity="down-is-good" comparison={cmp(prev?.estornosCentavos)} description={r ? `${formatInteger(r.estornosQtd)} pedidos` : undefined} />
        <KpiCard label="Chargebacks" value={r?.chargebacksCentavos} loading={loading} polarity="down-is-good" comparison={cmp(prev?.chargebacksCentavos)} description={r ? `${formatInteger(r.chargebacksQtd)} pedidos` : undefined} />
        <KpiCard label="Perda total" value={r?.perdaTotalCentavos} loading={loading} highlight hero polarity="down-is-good" comparison={cmp(prev?.perdaTotalCentavos)} description="Cada pedido é contado uma única vez" />
        <KpiCard
          label="Taxa de reembolso"
          format="percent"
          value={taxa}
          loading={loading}
          polarity="down-is-good"
          comparison={cmp(taxaPrev)}
          unavailableReason={r && r.brutoCentavos === 0 ? 'Sem faturamento no período' : undefined}
          description="Perdas ÷ faturamento bruto pago"
        />
        <KpiCard label="Estorno + chargeback no mesmo pedido" format="integer" value={r?.pedidosComEstornoEChargeback} loading={loading} description="Contados uma vez; os dois eventos ficam auditáveis" />
        <KpiCard label="Comissão perdida" value={undefined} loading={loading} unavailableReason="O backend ainda não informa a comissão revertida nos reembolsos" />
      </KpiGrid>

      {r && r.perdasSemData > 0 && (
        <Notice tone="warning">
          <Badge variant="warning" className="mr-2">{formatInteger(r.perdasSemData)}</Badge> perdas sem data de estorno/chargeback: elas não entram na movimentação por data, apenas na visão de vendas aprovadas.
        </Notice>
      )}

      {r && r.limitacoes.length > 0 && (
        <Card className="print-break-avoid">
          <CardHeader><CardTitle>Limitações de conciliação</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">
              {r.limitacoes.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <PageGrid cols={3}>
        <Span2>
          <RevenueLineChart
            title="Evolução de reembolsos"
            series={[
              toLineSeries('estorno', 'Estornos', 'var(--chart-1)', evolucao.data?.data, (x) => x.estornosCentavos),
              toLineSeries('charge', 'Chargebacks', 'var(--negative)', evolucao.data?.data, (x) => x.chargebacksCentavos),
            ]}
            loading={evolucao.isPending}
            error={evolucao.error}
            onRetry={() => void evolucao.refetch()}
          />
        </Span2>
        <CategoryPieChart
          title="Perdas por grupo"
          data={(porGrupo.data?.data ?? []).map((g) => ({ name: grupoLabel(g.chave ?? ''), value: g.estornosCentavos + g.chargebacksCentavos })).filter((g) => g.value > 0)}
          loading={porGrupo.isPending}
          error={porGrupo.error}
          onRetry={() => void porGrupo.refetch()}
        />
      </PageGrid>

      <FinancialBarChart
        title="Perdas por loja"
        data={(porLoja.data?.data ?? []).map((l) => ({ label: dimLabel(l.chave), value: l.estornosCentavos + l.chargebacksCentavos })).filter((l) => l.value > 0).sort((a, b) => b.value - a.value).slice(0, 10)}
        loading={porLoja.isPending}
        error={porLoja.error}
        onRetry={() => void porLoja.refetch()}
        valueLabel="Perdas"
      />

      <ContentSection
        title="Pedidos com perda"
        description={`Taxa no período: ${formatPercentage(taxa)}`}
        actions={<Segmented label="Tipo de perda" value={visao} onChange={setVisao} options={[{ value: 'todos', label: 'Todos' }, { value: 'estornos', label: 'Estornos' }, { value: 'chargebacks', label: 'Chargebacks' }]} />}
      >
        <VendasTable key={visao} id={`reemb-${visao}`} domain="reembolsos" resource={`lista-${visao}`} fetcher={LISTAS[visao]} title="Pedidos com perda" keys={KEYS} showLoss />
      </ContentSection>
    </>
  );
}
