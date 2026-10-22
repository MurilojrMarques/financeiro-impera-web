import { useState } from 'react';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid } from '@/components/cards/KpiGrid';
import { FinancialBarChart } from '@/components/charts/FinancialBarChart';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Notice } from '@/components/feedback/Notice';
import { OutdatedDataWarning } from '@/components/feedback/OutdatedDataWarning';
import { FilterToolbar } from '@/components/filters/FilterToolbar';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageGrid } from '@/components/layout/PageGrid';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/segmented';
import { useFilters } from '@/hooks/useFilters';
import { usePagedReport, useReport } from '@/hooks/useReport';
import { useTableState } from '@/hooks/useTableState';
import { formatDateTime } from '@/lib/dates';
import { dimLabel, formatInteger } from '@/lib/formatters';
import { campanhasService } from '@/services/campanhas.service';
import type { ExtraFilterKey } from '@/types/filters.types';
import type { RedtrackConversao, RedtrackDivergencia } from '@/types/financial.types';
import { DimensionTable } from '../shared/DimensionTable';
import { useWithComparison } from '../shared/useComparison';

const KEYS: ExtraFilterKey[] = ['loja', 'campanha', 'metodo'];

/** Atribuição e conciliação Pagah × RedTrack. Nem toda venda tem atribuição: a cobertura é um indicador, não um erro. */
export default function CampanhasPage() {
  const { apiParams } = useFilters();
  const params = apiParams(KEYS);
  const [aba, setAba] = useState<'divergencias' | 'conversoes'>('divergencias');
  const div = useTableState('div', { limit: 20 });
  const conv = useTableState('conv', { limit: 20 });

  const resumo = useWithComparison('campanhas', 'resumo', campanhasService.resumo, { keys: KEYS });
  const campanhas = useReport('campanhas', 'lista', campanhasService.porCampanha, params);
  const anuncios = useReport('campanhas', 'por-anuncio', campanhasService.porAnuncio, params);
  const lojas = useReport('campanhas', 'por-loja', campanhasService.porLoja, params);
  const conciliacao = useReport('redtrack', 'conciliacao', campanhasService.conciliacao, apiParams(['loja', 'metodo']));
  const divergencias = usePagedReport('redtrack', 'divergencias', campanhasService.divergencias, { page: div.state.page, limit: div.state.limit }, { autoRefresh: false });
  const conversoes = usePagedReport('redtrack', 'conversoes', campanhasService.conversoes, { page: conv.state.page, limit: conv.state.limit }, { autoRefresh: false, enabled: aba === 'conversoes' });

  const cur = resumo.current;
  const r = cur.data?.data;
  const prev = resumo.comparison.data?.data;
  const cmp = (p: number | undefined) => (resumo.hasComparison ? { previous: p, loading: resumo.comparison.isPending } : undefined);
  const c = conciliacao.data?.data;

  const colsDiv: Column<RedtrackDivergencia>[] = [
    { id: 'pedido', header: 'Pedido', mobile: 'title', cell: (x) => <span className="font-mono text-xs">{x.pedido}</span> },
    { id: 'tipo', header: 'Situação', mobile: 'value', cell: (x) => (x.tipo === 'SEM_VENDA' ? <Badge variant="warning">Conversão sem venda</Badge> : <Badge variant="negative">Payout ≠ comissão</Badge>) },
    { id: 'com', header: 'Comissão Pagah', align: 'right', cell: (x) => <CurrencyValue centavos={x.comissaoCentavos} /> },
    { id: 'pay', header: 'Payout RedTrack', align: 'right', cell: (x) => <CurrencyValue centavos={x.payoutCentavos} /> },
    {
      id: 'dif', header: 'Diferença', align: 'right',
      // diferença entre dois valores oficiais, só quando ambos existem
      cell: (x) => (x.payoutCentavos !== null && x.comissaoCentavos !== null ? <CurrencyValue centavos={x.payoutCentavos - x.comissaoCentavos} showSign /> : '—'),
    },
    { id: 'sit', header: 'Situação no RedTrack', cell: (x) => x.situacao ?? '—' },
  ];
  const colsConv: Column<RedtrackConversao>[] = [
    { id: 'pedido', header: 'Pedido', mobile: 'title', cell: (x) => <span className="font-mono text-xs">{x.pedido}</span> },
    { id: 'camp', header: 'Campanha', mobile: 'full', cell: (x) => x.campanha ?? '—' },
    { id: 'anu', header: 'Anúncio', mobile: 'full', cell: (x) => x.anuncio ?? '—' },
    { id: 'pay', header: 'Payout', align: 'right', cell: (x) => <CurrencyValue centavos={x.payoutCentavos} /> },
    { id: 'sit', header: 'Situação', cell: (x) => x.situacao ?? '—' },
    { id: 'venda', header: 'Venda', mobile: 'value', cell: (x) => (x.vendaId ? <Badge variant="positive">vinculada</Badge> : <Badge variant="warning">sem venda</Badge>) },
    { id: 'sinc', header: 'Sincronizado em', cell: (x) => formatDateTime(x.sincronizadoEm) },
  ];

  if (cur.isError && !cur.data) {
    return (<><FilterToolbar extras={KEYS} /><ErrorState error={cur.error} onRetry={() => void cur.refetch()} /></>);
  }

  const dm = divergencias.data?.meta;
  const cm = conversoes.data?.meta;

  return (
    <>
      <FilterToolbar extras={KEYS} />
      <OutdatedDataWarning lastSync={cur.data?.meta.ultimaSincronizacao} outdated={cur.data?.meta.dadosDesatualizados} fetchFailed={cur.isError && !!cur.data} />

      <KpiGrid cols={6}>
        <KpiCard label="Vendas com campanha" format="integer" value={r?.vendasComCampanha} loading={cur.isPending} highlight hero />
        <KpiCard label="Vendas sem campanha" format="integer" value={r?.vendasSemCampanha} loading={cur.isPending} description="Sem atribuição (ex.: vendas sem anúncio)" />
        <KpiCard label="Receita" value={r?.receitaCentavos} loading={cur.isPending} comparison={cmp(prev?.receitaCentavos)} />
        <KpiCard label="Comissão" emImplementacao value={r?.comissaoCentavos} loading={cur.isPending} estimated={!!r && r.comissaoEstimadaCentavos > 0} comparison={cmp(prev?.comissaoCentavos)} />
        <KpiCard label="Cobertura RedTrack" format="percent" value={c?.coberturaPercentual ?? undefined} loading={conciliacao.isPending} unavailableReason={c && c.coberturaPercentual === null ? 'Sem vendas no período' : undefined} description={c ? `${formatInteger(c.vendasComRedtrack)} de ${formatInteger(c.vendasNoPeriodo)} vendas` : undefined} />
        <KpiCard label="Divergências" format="integer" value={dm?.total} loading={divergencias.isPending} polarity="down-is-good" description={c ? `${formatInteger(c.conversoesSemVenda)} conversões sem venda` : undefined} />
      </KpiGrid>

      {c?.observacao && <Notice tone="info">{c.observacao} O payout por campanha ainda não é entregue pelo backend (ver comparativo de comissão × payout em Divergências).</Notice>}

      <PageGrid cols={2}>
        <FinancialBarChart title="Receita por campanha" data={(campanhas.data?.data ?? []).filter((x) => x.receitaCentavos > 0).slice(0, 10).map((x) => ({ label: dimLabel(x.chave), value: x.receitaCentavos }))} loading={campanhas.isPending} error={campanhas.error} onRetry={() => void campanhas.refetch()} />
        <FinancialBarChart title="Receita por anúncio" data={(anuncios.data?.data ?? []).filter((x) => x.receitaCentavos > 0).slice(0, 10).map((x) => ({ label: dimLabel(x.chave), value: x.receitaCentavos }))} loading={anuncios.isPending} error={anuncios.error} onRetry={() => void anuncios.refetch()} />
      </PageGrid>

      <ContentSection title="Campanhas">
        <DimensionTable caption="Campanhas" dimensionLabel="Campanha" data={campanhas.data?.data} loading={campanhas.isPending} error={campanhas.error} onRetry={() => void campanhas.refetch()} />
      </ContentSection>

      <PageGrid cols={2} from="xl">
        <ContentSection title="Anúncios"><DimensionTable caption="Anúncios" dimensionLabel="Anúncio" data={anuncios.data?.data} loading={anuncios.isPending} error={anuncios.error} onRetry={() => void anuncios.refetch()} /></ContentSection>
        <ContentSection title="Por loja"><DimensionTable caption="Campanhas por loja" dimensionLabel="Loja" data={lojas.data?.data} loading={lojas.isPending} error={lojas.error} onRetry={() => void lojas.refetch()} /></ContentSection>
      </PageGrid>

      {c && c.porSituacao.length > 0 && (
        <ContentSection title="Situação da conciliação" description="Conversões sincronizadas da aba REDTRACK, por situação">
          <div className="flex flex-wrap gap-2">
            {c.porSituacao.map((s) => <Badge key={s.situacao ?? '—'} variant="info">{s.situacao ?? 'Sem situação'}: {formatInteger(s.quantidade)}</Badge>)}
          </div>
        </ContentSection>
      )}

      <ContentSection
        title="Conciliação"
        actions={<Segmented label="Visão da conciliação" value={aba} onChange={setAba} options={[{ value: 'divergencias', label: 'Divergências' }, { value: 'conversoes', label: 'Conversões' }]} />}
      >
        {aba === 'divergencias' ? (
          <DataTable
            caption="Divergências de conciliação"
            columns={colsDiv}
            data={divergencias.data?.data}
            rowKey={(x) => `${x.pedido}-${x.tipo}`}
            loading={divergencias.isPending}
            fetching={divergencias.isFetching && !divergencias.isPending}
            error={divergencias.error}
            onRetry={() => void divergencias.refetch()}
            empty={{ title: 'Nenhuma divergência encontrada.' }}
            pagination={dm && { page: dm.page, limit: dm.limit, total: dm.total, totalPages: dm.totalPages, onPageChange: (page) => div.update({ page }), onLimitChange: (limit) => div.update({ limit }) }}
          />
        ) : (
          <DataTable
            caption="Conversões RedTrack"
            columns={colsConv}
            data={conversoes.data?.data}
            rowKey={(x) => x.pedido}
            loading={conversoes.isPending}
            fetching={conversoes.isFetching && !conversoes.isPending}
            error={conversoes.error}
            onRetry={() => void conversoes.refetch()}
            empty={{ title: 'Nenhuma conversão sincronizada.' }}
            pagination={cm && { page: cm.page, limit: cm.limit, total: cm.total, totalPages: cm.totalPages, onPageChange: (page) => conv.update({ page }), onLimitChange: (limit) => conv.update({ limit }) }}
          />
        )}
      </ContentSection>
    </>
  );
}
