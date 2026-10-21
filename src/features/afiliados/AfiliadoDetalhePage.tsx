import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid } from '@/components/cards/KpiGrid';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { RevenueLineChart } from '@/components/charts/RevenueLineChart';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OutdatedDataWarning } from '@/components/feedback/OutdatedDataWarning';
import { FilterToolbar } from '@/components/filters/FilterToolbar';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageGrid, Span2 } from '@/components/layout/PageGrid';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { useFilters } from '@/hooks/useFilters';
import { useReport } from '@/hooks/useReport';
import { dimLabel, fonteComissaoLabel } from '@/lib/formatters';
import { afiliadosService } from '@/services/afiliados.service';
import { vendasService } from '@/services/vendas.service';
import type { Params } from '@/lib/query-keys';
import type { ExtraFilterKey } from '@/types/filters.types';
import { DimensionTable } from '../shared/DimensionTable';
import { toLineSeries } from '../shared/series';
import { useWithComparison } from '../shared/useComparison';
import { VendasTable } from '../shared/VendasTable';
import { AfiliadoAdminPanel } from './AfiliadoAdminPanel';

const KEYS: ExtraFilterKey[] = ['loja', 'metodo', 'status'];

export default function AfiliadoDetalhePage() {
  const { id = '' } = useParams();
  const { apiParams } = useFilters();
  const params: Params = { ...apiParams(KEYS), afiliadoId: id };

  const cadastro = useReport('afiliados', `${id}/cadastro`, (_p, s) => afiliadosService.detalhe(id, s), {}, { autoRefresh: false });
  const resumo = useWithComparison('afiliados', `${id}/resumo`, (p, s) => afiliadosService.resumoDoAfiliado(id, p, s), { keys: KEYS });
  const comissoes = useReport('afiliados', `${id}/comissoes`, (p, s) => afiliadosService.comissoes(id, p, s), params);
  const evolucao = useReport('afiliados', `${id}/evolucao`, (p, s) => afiliadosService.evolucaoDoAfiliado(id, p, s), params);
  // dimensões do afiliado usam as rotas gerais de vendas filtradas por afiliadoId
  const lojas = useReport('vendas', `por-loja#afil-${id}`, vendasService.porLoja, params);
  const produtos = useReport('vendas', `por-produto#afil-${id}`, vendasService.porProduto, params);
  const metodos = useReport('vendas', `por-metodo#afil-${id}`, vendasService.porMetodo, params);

  const cur = resumo.current;
  const r = cur.data?.data;
  const prev = resumo.comparison.data?.data;
  const cmp = (p: number | undefined) => (resumo.hasComparison ? { previous: p, loading: resumo.comparison.isPending } : undefined);
  const nome = cadastro.data?.data.nome ?? 'Afiliado';

  if (cadastro.isError) {
    return (
      <>
        <Button asChild variant="ghost" size="sm"><Link to="/afiliados"><ArrowLeft /> Afiliados</Link></Button>
        <ErrorState error={cadastro.error} onRetry={() => void cadastro.refetch()} />
      </>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="no-print -mb-3 w-fit"><Link to="/afiliados"><ArrowLeft /> Todos os afiliados</Link></Button>
      <PageHeader title={nome} description={cadastro.data ? `${cadastro.data.data._count.vendas} vendas registradas · ${cadastro.data.data._count.aliases} aliases` : undefined} />
      <FilterToolbar extras={KEYS} />
      <OutdatedDataWarning lastSync={cur.data?.meta.ultimaSincronizacao} outdated={cur.data?.meta.dadosDesatualizados} fetchFailed={cur.isError && !!cur.data} />

      <KpiGrid cols={5}>
        <KpiCard label="Receita total" value={r?.brutoCentavos} loading={cur.isPending} highlight hero comparison={cmp(prev?.brutoCentavos)} description="Faturamento (valor sem juros)" />
        <KpiCard label="Pedidos" format="integer" value={r?.pedidos} loading={cur.isPending} comparison={cmp(prev?.pedidos)} />
        <KpiCard label="Comissão do afiliado" value={comissoes.data?.data.comissaoAfiliadoCentavos} loading={comissoes.isPending} estimated={(r?.comissaoAfiliadoEstimadaCentavos ?? 0) > 0} description="O que ele recebe" />
        <KpiCard label="Ticket médio" value={r?.ticketMedioCentavos} loading={cur.isPending} comparison={cmp(prev?.ticketMedioCentavos)} />
        <KpiCard label="Reembolsos" value={r?.reembolsosCentavos} loading={cur.isPending} polarity="down-is-good" comparison={cmp(prev?.reembolsosCentavos)} />
      </KpiGrid>

      {comissoes.data && comissoes.data.data.porFonteDaComissaoDoAfiliado.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Fonte da comissão do afiliado:{' '}
          {comissoes.data.data.porFonteDaComissaoDoAfiliado.map((f) => `${fonteComissaoLabel(f.fonte)} (${f.pedidos} pedidos)`).join(' · ')}
        </p>
      )}

      <PageGrid cols={3}>
        <Span2>
          <RevenueLineChart title="Evolução" series={[toLineSeries('af', nome, 'var(--chart-4)', evolucao.data?.data)]} loading={evolucao.isPending} error={evolucao.error} onRetry={() => void evolucao.refetch()} />
        </Span2>
        <CategoryPieChart title="Métodos de pagamento" data={(metodos.data?.data ?? []).map((m) => ({ name: dimLabel(m.chave), value: m.receitaCentavos }))} loading={metodos.isPending} error={metodos.error} onRetry={() => void metodos.refetch()} />
      </PageGrid>

      <PageGrid cols={2} from="xl">
        <ContentSection title="Vendas por loja"><DimensionTable caption="Vendas por loja" dimensionLabel="Loja" data={lojas.data?.data} loading={lojas.isPending} error={lojas.error} onRetry={() => void lojas.refetch()} /></ContentSection>
        <ContentSection title="Vendas por produto"><DimensionTable caption="Vendas por produto" dimensionLabel="Produto" data={produtos.data?.data} loading={produtos.isPending} error={produtos.error} onRetry={() => void produtos.refetch()} limit={10} /></ContentSection>
      </PageGrid>

      <ContentSection title="Pedidos do afiliado">
        <VendasTable id="afil-vendas" domain="afiliados" resource={`${id}/vendas`} fetcher={(p, s) => afiliadosService.vendas(id, p, s)} title="Pedidos do afiliado" keys={KEYS} />
      </ContentSection>

      <ContentSection title="Administração do afiliado">
        <AfiliadoAdminPanel afiliadoId={id} nome={nome} />
      </ContentSection>
    </>
  );
}
