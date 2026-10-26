import { useQuery } from '@tanstack/react-query';
import { KpiCard } from '@/components/cards/KpiCard';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { KpiGrid, KpiGroup } from '@/components/cards/KpiGrid';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Notice } from '@/components/feedback/Notice';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { retryPolicy } from '@/hooks/useReport';
import { formatInteger, formatPercentage } from '@/lib/formatters';
import { rhService } from '@/services/rh.service';
import type { RhAgrupamento } from '@/types/rh.types';
import { senioridadeLabel } from './rh-format';

/** Painel da folha (RH e CEO): quanto a Impera paga por mês em salários e como isso se distribui. Tudo vem pronto da API. */
export default function PainelPage() {
  const q = useQuery({ queryKey: ['rh', 'painel'], retry: retryPolicy, queryFn: async ({ signal }) => (await rhService.painel(signal)).data });
  const r = q.data;
  const loading = q.isPending;

  if (q.isError && !r) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;

  const colunas = (rotulo: string, nome: (n: string) => string): Column<RhAgrupamento>[] => [
    { id: 'nome', header: rotulo, mobile: 'title', cell: (x) => <span className="font-medium">{nome(x.nome)}</span> },
    { id: 'qtd', header: 'Pessoas', align: 'right', cell: (x) => formatInteger(x.quantidade) },
    { id: 'folha', header: 'Folha mensal', align: 'right', mobile: 'value', cell: (x) => <CurrencyValue centavos={x.folhaCentavos} /> },
    { id: 'media', header: 'Média', align: 'right', cell: (x) => <CurrencyValue centavos={x.mediaCentavos} /> },
    {
      id: 'part',
      header: '% da folha',
      align: 'right',
      cell: (x) => (r && r.folhaMensalCentavos > 0 ? formatPercentage((x.folhaCentavos * 100) / r.folhaMensalCentavos, 1) : '—'),
    },
  ];

  return (
    <>
      <PageHeader title="Painel da folha" description="O que a Impera paga por mês aos colaboradores PJ, pelo salário cadastrado no sistema de RH." />
      <Notice tone="info">
        Salário, cargo e promoção são alterados <strong className="font-medium text-foreground">somente no sistema de RH</strong>. Aqui você consulta e acompanha: qualquer mudança lá aparece neste painel
        automaticamente (veja a aba Monitoramento).
      </Notice>

      <KpiGroup title="Folha de hoje">
        <KpiGrid cols={4}>
          <KpiCard label="Folha mensal" hero highlight value={r?.folhaMensalCentavos} loading={loading} description="Soma dos salários de quem está ativo (sem encargos)" />
          <KpiCard label="Colaboradores ativos" format="integer" value={r?.ativos} loading={loading} />
          <KpiCard label="Salário médio" value={r?.mediaSalarialCentavos} loading={loading} />
          <KpiCard label="Desligados" format="integer" value={r?.desligados} loading={loading} description="Registrados no sistema de RH" />
        </KpiGrid>
      </KpiGroup>

      <KpiGroup title="Últimos 90 dias">
        <KpiGrid cols={4}>
          <KpiCard label="Movimentações" format="integer" value={r?.ultimos90Dias.movimentacoes} loading={loading} />
          <KpiCard label="Promoções" format="integer" value={r?.ultimos90Dias.promocoes} loading={loading} />
          <KpiCard label="Reajustes" format="integer" value={r?.ultimos90Dias.reajustes} loading={loading} />
          <KpiCard label="Aumento mensal na folha" value={r?.ultimos90Dias.aumentoMensalCentavos} loading={loading} polarity="down-is-good" description="Soma dos aumentos concedidos no período" />
        </KpiGrid>
      </KpiGroup>

      <ContentSection title="Por departamento" description="Pessoas, folha mensal, média e participação de cada área.">
        <DataTable caption="Folha por departamento" columns={colunas('Departamento', (n) => n)} data={r?.porDepartamento} rowKey={(x) => x.nome} loading={loading} dense empty={{ title: 'Sem colaboradores ativos.' }} />
      </ContentSection>

      <ContentSection title="Por senioridade">
        <DataTable caption="Folha por senioridade" columns={colunas('Senioridade', (n) => (n === 'sem senioridade' ? 'Sem senioridade' : senioridadeLabel(n)))} data={r?.porSenioridade} rowKey={(x) => x.nome} loading={loading} dense />
      </ContentSection>
    </>
  );
}
