import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid, KpiGroup } from '@/components/cards/KpiGrid';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Notice } from '@/components/feedback/Notice';
import { OutdatedDataWarning } from '@/components/feedback/OutdatedDataWarning';
import { FilterToolbar } from '@/components/filters/FilterToolbar';
import { ContentSection } from '@/components/layout/ContentSection';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { formatCurrency } from '@/lib/currency';
import { comissoesService } from '@/services/comissoes.service';
import type { ComissaoPessoa } from '@/types/comissoes.types';
import { useWithComparison } from '../shared/useComparison';

/**
 * Todas as comissões do período num lugar só. MC BR é margem da empresa e não entra aqui: a comissão do Front é a do sistema de copy
 * (5% do MC BR de cada pessoa), lida de lá; o resto segue as regras de cada canal.
 */
export default function ComissoesPage() {
  const resumo = useWithComparison('comissoes', 'resumo', comissoesService.resumo, { keys: [] });
  const cur = resumo.current;
  const r = cur.data?.data;
  const prev = resumo.comparison.data?.data;
  const cmp = (p: number | undefined) => (resumo.hasComparison ? { previous: p, loading: resumo.comparison.isPending } : undefined);
  const loading = cur.isPending;

  if (cur.isError && !cur.data) {
    return (
      <>
        <FilterToolbar extras={[]} />
        <ErrorState error={cur.error} onRetry={() => void cur.refetch()} />
      </>
    );
  }

  const front = r?.front;
  const frontOk = front?.disponivel === true ? front : null;
  const prevFront = prev?.front.disponivel ? prev.front.comissaoCentavos : undefined;

  const cols: Column<ComissaoPessoa>[] = [
    { id: 'nome', header: 'Pessoa', mobile: 'title', cell: (p) => <span className="font-medium">{p.nome}</span> },
    { id: 'mc', header: 'MC BR dos criativos', align: 'right', sortable: true, sortValue: (p) => p.mcBrCentavos, cell: (p) => <CurrencyValue centavos={p.mcBrCentavos} /> },
    { id: 'com', header: 'Comissão apurada (5%)', align: 'right', sortable: true, sortValue: (p) => p.comissaoCentavos, cell: (p) => <CurrencyValue centavos={p.comissaoCentavos} /> },
    { id: 'pagar', header: 'A pagar', align: 'right', sortable: true, sortValue: (p) => p.aPagarCentavos, cell: (p) => <CurrencyValue centavos={p.aPagarCentavos} /> },
  ];

  return (
    <>
      <FilterToolbar extras={[]} />
      <OutdatedDataWarning lastSync={cur.data?.meta.ultimaSincronizacao} outdated={cur.data?.meta.dadosDesatualizados} fetchFailed={cur.isError && !!cur.data} />

      <Notice tone="info" className="no-print">
        <strong className="text-foreground">MC BR não é comissão</strong>: é a margem que sobra para a empresa. A comissão do Front é a do <strong className="text-foreground">sistema de copy</strong> (5%
        do MC BR de cada pessoa): mudou lá, muda aqui.
      </Notice>
      {r?.totalSemFront && front && !front.disponivel && <Notice tone="warning">{front.mensagem} O total abaixo não inclui a comissão do Front.</Notice>}

      <KpiGroup title="Comissões do período">
        <KpiGrid cols={4}>
          <KpiCard
            label="Total de comissões"
            hero
            highlight
            value={r?.totalCentavos}
            loading={loading}
            partial={r?.totalSemFront === true}
            estimated={frontOk?.estado === 'PROVISORIO'}
            comparison={cmp(prev?.totalCentavos)}
            description="Front (copy) + Call Center + Recuperação + Afiliados"
          />
          <KpiCard
            label="Front (Copy)"
            value={frontOk?.comissaoCentavos}
            loading={loading}
            unavailableReason={front && !front.disponivel ? front.mensagem : 'Sistema de copy indisponível'}
            estimated={frontOk?.estado === 'PROVISORIO'}
            comparison={cmp(prevFront)}
            description={frontOk ? `5% do MC BR de ${frontOk.quantidadePessoas} pessoas, com os negativos. A pagar, sem negativos: ${formatCurrency(frontOk.aPagarCentavos)}${frontOk.estado === 'PROVISORIO' ? '. Provisório: custo dos últimos dias em revisão' : ''}` : 'Vem do sistema de copy'}
          />
          <KpiCard label="Call Center" value={r?.callCenter.comissaoCentavos} loading={loading} comparison={cmp(prev?.callCenter.comissaoCentavos)} description={r ? `${r.callCenter.regra}. Base: ${formatCurrency(r.callCenter.baseCentavos)}` : undefined} />
          <KpiCard label="Recuperação" value={r?.recuperacao.comissaoCentavos} loading={loading} comparison={cmp(prev?.recuperacao.comissaoCentavos)} description={r ? `${r.recuperacao.regra}. Base: ${formatCurrency(r.recuperacao.baseCentavos)}` : undefined} />
          <KpiCard label="Afiliados" value={r?.afiliados.comissaoCentavos} loading={loading} comparison={cmp(prev?.afiliados.comissaoCentavos)} description="O que os afiliados recebem (regra por afiliado)" />
          <KpiCard label="Backend Outros" emImplementacao value={undefined} description={r?.backendOutros.mensagem} />
        </KpiGrid>
      </KpiGroup>

      {frontOk && (
        <ContentSection
          title="Front por pessoa"
          description="Como o sistema de copy apura: 5% do MC BR dos criativos de cada pessoa. Quem fecha negativo recebe só o fixo (a pagar fica em zero)."
        >
          {frontOk.pessoas ? (
            <DataTable
              caption="Comissão do Front por pessoa"
              columns={cols}
              data={frontOk.pessoas}
              rowKey={(p) => p.copywriterId}
              loading={loading}
              empty={{ title: 'Nenhuma pessoa com MC BR no período.' }}
            />
          ) : (
            <Notice tone="info">A lista por pessoa é visível só para o Financeiro e o administrador.</Notice>
          )}
          {frontOk.mcBrSemComissaoCentavos !== 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              MC BR sem comissão (anúncios sem dono e da empresa): <CurrencyValue centavos={frontOk.mcBrSemComissaoCentavos} />.
            </p>
          )}
        </ContentSection>
      )}
    </>
  );
}
