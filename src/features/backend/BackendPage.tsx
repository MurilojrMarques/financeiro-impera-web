import { Link } from 'react-router-dom';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid } from '@/components/cards/KpiGrid';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { FinancialBarChart } from '@/components/charts/FinancialBarChart';
import { RevenueLineChart } from '@/components/charts/RevenueLineChart';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Notice } from '@/components/feedback/Notice';
import { OutdatedDataWarning } from '@/components/feedback/OutdatedDataWarning';
import { FilterToolbar } from '@/components/filters/FilterToolbar';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageGrid, Span2 } from '@/components/layout/PageGrid';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useFilters } from '@/hooks/useFilters';
import { usePagedReport, useReport } from '@/hooks/useReport';
import { formatCurrency } from '@/lib/currency';
import { dimLabel, formatInteger } from '@/lib/formatters';
import { backendService } from '@/services/backend.service';
import type { ExtraFilterKey } from '@/types/filters.types';
import type { CanalRow } from '@/types/financial.types';
import { AlertsPanel } from '../shared/AlertsPanel';
import { DimensionTable } from '../shared/DimensionTable';
import { toLineSeries } from '../shared/series';
import { useWithComparison } from '../shared/useComparison';
import { VendasTable } from '../shared/VendasTable';

const KEYS: ExtraFilterKey[] = ['loja', 'produto', 'origem', 'metodo'];

/** Back-end Outros (NÃO inclui Call Center). O consolidado backendTotal aparece como indicador separado. */
export default function BackendPage() {
  const { apiParams } = useFilters();
  const params = apiParams(KEYS);

  const resumo = useWithComparison('backend', 'resumo', backendService.resumo, { keys: KEYS });
  const total = useReport('backend', 'total', backendService.total, params);
  const canais = useReport('backend', 'por-canal', backendService.porCanal, params);
  const origens = useReport('backend', 'por-origem', backendService.porOrigem, params);
  const lojas = useReport('backend', 'por-loja', backendService.porLoja, params);
  const produtos = useReport('backend', 'por-produto', backendService.porProduto, params);
  const evolucao = useReport('backend', 'evolucao', backendService.evolucao, params);
  const pend = usePagedReport('backend', 'nao-classificadas#contagem', backendService.naoClassificadas, { ...params, limit: 1, page: 1 });

  const cur = resumo.current;
  const r = cur.data?.data;
  const prev = resumo.comparison.data?.data;
  const cmp = (p: number | undefined) => (resumo.hasComparison ? { previous: p, loading: resumo.comparison.isPending } : undefined);
  const loading = cur.isPending;
  const refunds = r ? r.estornosCentavos + r.chargebacksCentavos : undefined;
  const prevRefunds = prev ? prev.estornosCentavos + prev.chargebacksCentavos : undefined;
  const naoClass = pend.data?.meta.total;

  const canalData = (canais.data?.data ?? []).map((c: CanalRow) => ({ name: c.canal, value: c.receitaCentavos }));
  const semCanais = !canais.isPending && !canais.error && (canais.data?.data.length ?? 0) === 0;

  if (cur.isError && !cur.data) {
    return (<><FilterToolbar extras={KEYS} /><ErrorState error={cur.error} onRetry={() => void cur.refetch()} /></>);
  }

  return (
    <>
      <FilterToolbar extras={KEYS} />
      <OutdatedDataWarning lastSync={cur.data?.meta.ultimaSincronizacao} outdated={cur.data?.meta.dadosDesatualizados} fetchFailed={cur.isError && !!cur.data} />

      <Notice tone="info" className="no-print">
        Esta página mostra <strong className="text-foreground">Back-end</strong> (SMS, e-mail marketing e disparo para a base) e <strong className="text-foreground">não inclui o Call Center nem a Recuperação de vendas</strong>, que têm páginas próprias.
        O consolidado <strong className="text-foreground">Back-end Total</strong> (Back-end + Call Center + Recuperação) aparece abaixo como indicador agregado e nunca é somado de novo.
      </Notice>

      <KpiGrid cols={6}>
        <KpiCard label="Faturamento Back-end" value={r?.brutoCentavos} loading={loading} highlight hero comparison={cmp(prev?.brutoCentavos)} description={r ? `Valor sem juros. Líquida após estornos: ${formatCurrency(r.receitaCentavos)}` : undefined} />
        <KpiCard label="Pedidos" format="integer" value={r?.pedidos} loading={loading} comparison={cmp(prev?.pedidos)} />
        <KpiCard label="Ticket médio" value={r?.ticketMedioCentavos} loading={loading} comparison={cmp(prev?.ticketMedioCentavos)} />
        <KpiCard label="Comissão" value={r?.comissaoCentavos} loading={loading} estimated={!!r && r.comissaoEstimadaCentavos > 0} comparison={cmp(prev?.comissaoCentavos)} />
        <KpiCard label="Reembolsos" value={refunds} loading={loading} polarity="down-is-good" comparison={cmp(prevRefunds)} description={r ? `${r.estornosQtd} estornos · ${r.chargebacksQtd} chargebacks` : undefined} />
        <KpiCard
          label="Back-end Total (consolidado)"
          value={total.data?.data.backendTotal.receitaCentavos}
          loading={total.isPending}
          description="Back-end + Call Center + Recuperação (agregado)"
        />
      </KpiGrid>

      {naoClass !== undefined && naoClass > 0 && (
        <Notice tone="warning" action={<a href="#nao-classificadas" className="text-[13px] font-medium text-primary underline-offset-4 hover:underline">Ver lista</a>}>
          <Badge variant="warning" className="mr-2">{formatInteger(naoClass)}</Badge>
          vendas sem origem confiável (não classificadas). Elas não entram em Back-end Outros: o backend não inventa classificação.
        </Notice>
      )}

      <PageGrid cols={3}>
        <Span2>
          <RevenueLineChart title="Evolução do período" series={[toLineSeries('back', 'Back-end Outros', 'var(--chart-2)', evolucao.data?.data)]} loading={evolucao.isPending} error={evolucao.error} onRetry={() => void evolucao.refetch()} />
        </Span2>
        {semCanais ? (
          <Card className="p-4">
            <EmptyState
              title="Nenhum canal identificado"
              description="Os canais (SMS, e-mail, disparo) vêm da coluna subcanal da planilha. Sem vendas de back-end no período, não há o que mostrar."
              action={<Link className="text-xs text-primary hover:underline" to="/configuracoes">Abrir configurações</Link>}
            />
          </Card>
        ) : (
          <CategoryPieChart title="Receita por canal" description="Canal informado na planilha (subcanal)" data={canalData} loading={canais.isPending} error={canais.error} onRetry={() => void canais.refetch()} />
        )}
      </PageGrid>

      <PageGrid cols={2}>
        <FinancialBarChart title="Receita por origem" data={(origens.data?.data ?? []).filter((o) => o.receitaCentavos > 0).slice(0, 8).map((o) => ({ label: dimLabel(o.chave), value: o.receitaCentavos }))} loading={origens.isPending} error={origens.error} onRetry={() => void origens.refetch()} />
        <ContentSection title="Canais">
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border/60">
              {(canais.data?.data ?? []).map((c) => (
                <li key={c.canal} className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
                  <span className="min-w-0 flex-1 truncate font-medium">{c.canal}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatInteger(c.pedidos)} pedidos</span>
                  <span className="shrink-0 font-medium"><CurrencyValue centavos={c.receitaCentavos} /></span>
                </li>
              ))}
              {!canais.isPending && (canais.data?.data.length ?? 0) === 0 && <li className="px-4 py-6 text-center text-xs text-muted-foreground">Sem canais no período.</li>}
            </ul>
          </Card>
        </ContentSection>
      </PageGrid>

      <PageGrid cols={2} from="xl">
        <ContentSection title="Por origem"><DimensionTable caption="Receita por origem" dimensionLabel="Origem" data={origens.data?.data} loading={origens.isPending} error={origens.error} onRetry={() => void origens.refetch()} limit={10} /></ContentSection>
        <ContentSection title="Por loja"><DimensionTable caption="Receita por loja" dimensionLabel="Loja" data={lojas.data?.data} loading={lojas.isPending} error={lojas.error} onRetry={() => void lojas.refetch()} limit={10} /></ContentSection>
        <div className="min-w-0 xl:col-span-2">
          <ContentSection title="Por produto"><DimensionTable caption="Receita por produto" dimensionLabel="Produto" data={produtos.data?.data} loading={produtos.isPending} error={produtos.error} onRetry={() => void produtos.refetch()} limit={10} /></ContentSection>
        </div>
      </PageGrid>

      <ContentSection title="Vendas de Back-end Outros">
        <VendasTable id="backend-vendas" domain="backend" resource="vendas" fetcher={backendService.vendas} title="Vendas de Back-end Outros" keys={KEYS} />
      </ContentSection>

      <div id="nao-classificadas">
        <ContentSection title="Vendas não classificadas" description="Pendências: nenhuma regra ou critério confiável identificou a origem destas vendas">
          <VendasTable id="backend-nc" domain="backend" resource="nao-classificadas" fetcher={backendService.naoClassificadas} title="Vendas não classificadas" keys={['loja', 'produto', 'metodo']} />
        </ContentSection>
      </div>

      <AlertsPanel alertas={r?.alertas} />
    </>
  );
}
