import { Link } from 'react-router-dom';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid } from '@/components/cards/KpiGrid';
import { FinancialSummary } from '@/components/cards/FinancialSummary';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { ComparisonChart } from '@/components/charts/ComparisonChart';
import { FinancialBarChart } from '@/components/charts/FinancialBarChart';
import { RevenueLineChart } from '@/components/charts/RevenueLineChart';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OutdatedDataWarning } from '@/components/feedback/OutdatedDataWarning';
import { FilterToolbar } from '@/components/filters/FilterToolbar';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageGrid, Span2 } from '@/components/layout/PageGrid';
import { Button } from '@/components/ui/button';
import { useFilters } from '@/hooks/useFilters';
import { usePermissions } from '@/hooks/usePermissions';
import { useReport } from '@/hooks/useReport';
import { formatCurrency } from '@/lib/currency';
import { dimLabel, formatInteger } from '@/lib/formatters';
import { callCenterService } from '@/services/call-center.service';
import { custosService } from '@/services/custos.service';
import { ReceitaCustosCallCenter } from './ReceitaCustosCallCenter';
import type { ExtraFilterKey } from '@/types/filters.types';
import type { CallCenterReceitaCustos } from '@/types/trafego.types';
import { AlertsPanel } from '../shared/AlertsPanel';
import { DimensionTable } from '../shared/DimensionTable';
import { toLineSeries } from '../shared/series';
import { useWithComparison } from '../shared/useComparison';
import { VendasTable } from '../shared/VendasTable';

const KEYS: ExtraFilterKey[] = ['loja', 'produto', 'metodo'];
const RECUP_LABEL: Record<string, string> = { PIX: 'Pix', BOLETO: 'Boleto', ABANDONO: 'Abandono', OUTROS: 'Outros tipos', NAO_INFORMADO: 'Não informado' };

export default function CallCenterPage() {
  const { apiParams, range } = useFilters();
  const { can } = usePermissions();
  const verCustos = can('call-center.custos');
  const params = apiParams(KEYS);

  const resumo = useWithComparison('call-center', 'resumo', callCenterService.resumo, { keys: KEYS });
  const evolucao = useReport('call-center', 'evolucao', callCenterService.evolucao, params);
  const atendentes = useReport('call-center', 'por-atendente', callCenterService.porAtendente, params);
  const lojas = useReport('call-center', 'por-loja', callCenterService.porLoja, params);
  const produtos = useReport('call-center', 'por-produto', callCenterService.porProduto, params);
  const metodos = useReport('call-center', 'por-metodo', callCenterService.porMetodo, params);
  const tipos = useReport('call-center', 'por-tipo-atendimento', callCenterService.porTipoAtendimento, params);
  const recup = useReport('call-center', 'recuperacoes', callCenterService.recuperacoes, params);
  const comissoes = useReport('call-center', 'comissoes', callCenterService.comissoes, params);
  const rc = useWithComparison<CallCenterReceitaCustos>('call-center', 'receita-custos', callCenterService.receitaCustos, { keys: KEYS });
  const lancamentos = useReport('custos', 'resumo#call-center', (p, s) => custosService.resumo(p, s), { de: range.de, ate: range.ate, grupo: 'CALL_CENTER' }, { enabled: verCustos });

  const cur = resumo.current;
  const r = cur.data?.data;
  const prev = resumo.comparison.data?.data;
  const rcr = rc.current.data?.data;
  const rcPrev = rc.comparison.data?.data;
  const rcLoading = rc.current.isPending;
  const semCustos = rcr && rcr.sobraCentavos === null ? 'Custos e margem do Call Center exigem perfil Financeiro ou Administrador' : undefined;
  const cmpRc = (p: number | null | undefined) => (rc.hasComparison ? { previous: p ?? undefined, loading: rc.comparison.isPending } : undefined);

  if (cur.isError && !cur.data) {
    return (<><FilterToolbar extras={KEYS} /><ErrorState error={cur.error} onRetry={() => void cur.refetch()} /></>);
  }

  const recupRows = (recup.data?.data ?? []).map((x) => ({ ...x, chave: RECUP_LABEL[x.categoria] ?? x.categoria }));

  return (
    <>
      <FilterToolbar extras={KEYS} />
      <OutdatedDataWarning lastSync={cur.data?.meta.ultimaSincronizacao} outdated={cur.data?.meta.dadosDesatualizados} fetchFailed={cur.isError && !!cur.data} />

      <KpiGrid cols={6}>
        <KpiCard
          label="Faturamento"
          value={rcr?.faturamentoCentavos}
          loading={rcLoading}
          highlight
          hero
          comparison={cmpRc(rcPrev?.faturamentoCentavos)}
          description={rcr ? `Valor sem juros dos pagamentos. Líquida após estornos: ${formatCurrency(rcr.receitaLiquidaCentavos)}` : undefined}
        />
        <KpiCard label="Pedidos" format="integer" value={rcr?.pedidos} loading={rcLoading} comparison={cmpRc(rcPrev?.pedidos)} />
        <KpiCard label="Ticket médio" value={rcr?.ticketMedioCentavos ?? undefined} loading={rcLoading} comparison={cmpRc(rcPrev?.ticketMedioCentavos)} description="Faturamento ÷ pedidos" />
        <KpiCard label="Unidades" format="integer" value={rcr?.unidades} loading={rcLoading} comparison={cmpRc(rcPrev?.unidades)} description={rcr && rcr.pedidos > 0 ? `${(rcr.unidades / rcr.pedidos).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por pedido` : undefined} />
        <KpiCard
          label="Sobra do Call Center"
          highlight
          value={rcr ? (rcr.sobraCentavos ?? undefined) : undefined}
          loading={rcLoading}
          unavailableReason={semCustos}
          valueTone={rcr?.sobraCentavos != null && rcr.sobraCentavos < 0 ? 'negative' : 'default'}
          comparison={cmpRc(rcPrev?.sobraCentavos)}
          description="Receita − taxas, frete, produto e custos da operação"
        />
        <KpiCard label="Margem do Call Center" format="percent" value={rcr?.margemBp == null ? undefined : rcr.margemBp / 100} loading={rcLoading} unavailableReason={semCustos} comparison={cmpRc(rcPrev?.margemBp == null ? undefined : rcPrev.margemBp / 100)} />
      </KpiGrid>

      <ReceitaCustosCallCenter q={rc} />

      {verCustos && (
        <PageGrid cols={2}>
          <FinancialSummary
            title="Custos da operação"
            description="Lançamentos do período por categoria"
            loading={lancamentos.isPending}
            rows={(lancamentos.data?.data.porCategoria ?? []).map((c) => ({ label: c.categoria, value: <CurrencyValue centavos={c.totalCentavos} /> }))}
            action={<Button asChild variant="secondary" size="sm"><Link to="/custos/call-center">Gerenciar lançamentos</Link></Button>}
            footer={
              (lancamentos.data?.data.porCategoria.length ?? 0) === 0 && !lancamentos.isPending
                ? 'Nenhum custo cadastrado para o Call Center neste período. Isso não significa custo zero: a sobra fica indisponível até haver lançamentos.'
                : `Total dos lançamentos: ${formatCurrency(lancamentos.data?.data.totalLancamentosCentavos ?? 0)}`
            }
          />
          <FinancialSummary
            title="Comissão e taxa do Call Center"
            description="Campos distintos, nunca somados"
            loading={comissoes.isPending}
            rows={[
              { label: 'Comissão da operação', value: <CurrencyValue centavos={comissoes.data?.data.comissaoCentavos} estimated={(comissoes.data?.data.comissaoEstimadaCentavos ?? 0) > 0} /> },
              { label: 'Taxa do Call Center', value: <CurrencyValue centavos={comissoes.data?.data.taxaCallCenterCentavos} /> },
              { label: 'Pedidos sem comissão informada', value: formatInteger(comissoes.data?.data.pedidosSemComissao) },
            ]}
            footer={comissoes.data?.data.observacao}
          />
        </PageGrid>
      )}

      <PageGrid cols={3}>
        <Span2>
          <RevenueLineChart title="Evolução diária" series={[toLineSeries('cc', 'Call Center', 'var(--chart-3)', evolucao.data?.data)]} loading={evolucao.isPending} error={evolucao.error} onRetry={() => void evolucao.refetch()} />
        </Span2>
        <ComparisonChart
          title="Comparativo de períodos"
          description={resumo.hasComparison ? undefined : 'Ative "Comparar com" para ver o período de comparação'}
          data={
            r && prev
              ? [
                  { label: 'Receita', atual: r.receitaCentavos, anterior: prev.receitaCentavos },
                  { label: 'Comissão', atual: r.comissaoCentavos, anterior: prev.comissaoCentavos },
                  { label: 'Taxa CC', atual: r.taxaCallCenterCentavos, anterior: prev.taxaCallCenterCentavos },
                  { label: 'Estornos', atual: r.estornosCentavos, anterior: prev.estornosCentavos },
                ]
              : []
          }
          loading={resumo.hasComparison && resumo.comparison.isPending}
          emptyText={resumo.hasComparison ? undefined : 'Escolha "Comparar com" nos filtros para ver este gráfico.'}
        />
      </PageGrid>

      <PageGrid cols={2} from="xl">
        <ContentSection title="Vendas por atendente" description="Somente quando a planilha informa o atendente">
          <DimensionTable caption="Vendas por atendente" dimensionLabel="Atendente" data={atendentes.data?.data} loading={atendentes.isPending} error={atendentes.error} onRetry={() => void atendentes.refetch()} limit={15} />
        </ContentSection>
        <ContentSection title="Recuperações" description="Pix, boleto, abandono e outros tipos de atendimento">
          <DimensionTable caption="Recuperações" dimensionLabel="Categoria" data={recupRows} loading={recup.isPending} error={recup.error} onRetry={() => void recup.refetch()} nameOf={(x) => x.chave ?? ''} />
        </ContentSection>
      </PageGrid>

      <PageGrid cols={2} from="xl">
        <ContentSection
          title="Origem das vendas"
          description="Por tipo de atendimento. Categorias de lead (ex.: Memória, Diabetes) ainda não são fornecidas pela API."
        >
          <DimensionTable caption="Vendas por tipo de atendimento" dimensionLabel="Origem / tipo" data={tipos.data?.data} loading={tipos.isPending} error={tipos.error} onRetry={() => void tipos.refetch()} />
        </ContentSection>
        <CategoryPieChart
          title="Receita por método de pagamento"
          data={(metodos.data?.data ?? []).map((m) => ({ name: dimLabel(m.chave), value: m.receitaCentavos }))}
          loading={metodos.isPending}
          error={metodos.error}
          onRetry={() => void metodos.refetch()}
        />
      </PageGrid>

      <PageGrid cols={2} from="xl">
        <FinancialBarChart title="Receita por loja" data={(lojas.data?.data ?? []).filter((x) => x.receitaCentavos > 0).slice(0, 8).map((x) => ({ label: dimLabel(x.chave), value: x.receitaCentavos }))} loading={lojas.isPending} error={lojas.error} onRetry={() => void lojas.refetch()} />
        <ContentSection title="Vendas por produto">
          <DimensionTable caption="Vendas por produto" dimensionLabel="Produto" data={produtos.data?.data} loading={produtos.isPending} error={produtos.error} onRetry={() => void produtos.refetch()} limit={10} />
        </ContentSection>
      </PageGrid>

      <ContentSection title="Vendas do Call Center">
        <VendasTable id="cc-vendas" domain="call-center" resource="vendas" fetcher={callCenterService.vendas} title="Vendas do Call Center" keys={KEYS} showAttendant />
      </ContentSection>

      <AlertsPanel alertas={r?.alertas} />
    </>
  );
}
