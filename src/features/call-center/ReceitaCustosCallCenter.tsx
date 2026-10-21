import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { ComparisonIndicator } from '@/components/cards/PercentageChange';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ContentSection } from '@/components/layout/ContentSection';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatInteger, formatPercentage } from '@/lib/formatters';
import type { CallCenterReceitaCustos, LinhaCusto } from '@/types/trafego.types';
import type { WithComparison } from '../shared/useComparison';

const negativo = (centavos: number | null) => (centavos === null ? <span className="text-muted-foreground">Indisponível</span> : <span className="tabular whitespace-nowrap">−<CurrencyValue centavos={centavos} /></span>);
const pct = (bp: number | null) => (bp === null ? '—' : formatPercentage(bp / 100, 1));

/**
 * "Para onde vai a receita do Call Center": mesmas taxas do Front sobre a receita do grupo, frete por remessa e custo de produto.
 * Tudo vem calculado de /call-center/receita-custos; aqui só há apresentação.
 */
export function ReceitaCustosCallCenter({ q }: { q: WithComparison<CallCenterReceitaCustos> }) {
  const cur = q.current;
  const r = cur.data?.data;
  const prev = q.comparison.data?.data;
  const loading = cur.isPending;
  const anterior = (codigo: string) => prev?.linhas.find((l) => l.codigo === codigo)?.valorCentavos;

  if (cur.isError && !cur.data) return <ErrorState error={cur.error} onRetry={() => void cur.refetch()} compact />;

  const colunas: Column<LinhaCusto>[] = [
    {
      id: 'custo', header: 'Custo', mobile: 'title',
      cell: (l) => (
        <span className="font-medium">
          {l.nome}
          {l.rotulo && <span className="block text-[11px] font-normal text-muted-foreground">{l.rotulo}</span>}
        </span>
      ),
    },
    { id: 'como', header: 'Como é calculado', mobile: 'full', className: 'min-w-72', cell: (l) => <span className="text-xs leading-relaxed text-muted-foreground">{l.comoCalculado}</span> },
    { id: 'valor', header: 'Valor', align: 'right', mobile: 'value', cell: (l) => negativo(l.valorCentavos) },
    { id: 'pct', header: '% do faturamento', align: 'right', cell: (l) => <span className="tabular">{pct(l.percentualFaturamentoBp)}</span> },
    { id: 'pedido', header: 'Por pedido', align: 'right', cell: (l) => <span className="tabular">{l.porPedidoCentavos === null ? '—' : <>−<CurrencyValue centavos={l.porPedidoCentavos} /></>}</span> },
    ...(q.hasComparison
      ? [{ id: 'vs', header: 'vs. anterior', align: 'right' as const, cell: (l: LinhaCusto) => <ComparisonIndicator current={l.valorCentavos} previous={anterior(l.codigo)} polarity="down-is-good" suffix="" /> }]
      : []),
  ];

  const total = r && (
    <TableRow className="font-semibold hover:bg-transparent">
      <TableCell>Total dos custos</TableCell>
      <TableCell className="text-xs font-normal text-muted-foreground">{formatInteger(r.remessas)} remessas · {formatInteger(r.unidades)} unidades</TableCell>
      <TableCell className="text-right">{negativo(r.totalCustosCentavos)}</TableCell>
      <TableCell className="tabular text-right">{pct(r.totalCustosPercentualBp)}</TableCell>
      <TableCell className="tabular text-right">{r.totalCustosPorPedidoCentavos === null ? '—' : <>−<CurrencyValue centavos={r.totalCustosPorPedidoCentavos} /></>}</TableCell>
      {q.hasComparison && <TableCell />}
    </TableRow>
  );

  const totalCard = r && (
    <div className="px-3.5 py-3">
      <div className="flex items-start justify-between gap-3 text-[14px] font-semibold">
        <span>Total dos custos</span>
        <span className="text-[15px]">{negativo(r.totalCustosCentavos)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {pct(r.totalCustosPercentualBp)} da receita · {formatInteger(r.remessas)} remessas · {formatInteger(r.unidades)} unidades
      </p>
    </div>
  );

  const linhaCard = (l: LinhaCusto) => (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium leading-snug">{l.nome}</p>
          {l.rotulo && <p className="text-xs text-muted-foreground">{l.rotulo}</p>}
        </div>
        <div className="shrink-0 text-right text-[15px] font-semibold leading-snug">{negativo(l.valorCentavos)}</div>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        <span className="tabular text-foreground">{pct(l.percentualFaturamentoBp)}</span> da receita
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{l.comoCalculado}</p>
    </div>
  );

  return (
    <ContentSection
      title="Para onde vai a receita do Call Center"
      description={r?.margemBp != null ? `a cada R$ 100 faturados, sobram R$ ${(r.margemBp / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined}
    >
      <DataTable
        caption="Custos do Call Center sobre a receita do período"
        columns={colunas}
        data={loading ? undefined : r?.linhas}
        loading={loading}
        rowKey={(l) => l.codigo}
        mobileCard={linhaCard}
        footer={total || undefined}
        mobileFooter={totalCard || undefined}
      />
      <p className="px-0.5 text-xs leading-relaxed text-muted-foreground">
        Mesmas taxas do Front sobre a receita do Call Center (editáveis em Front › Ajustar taxas e linhas). Custos da operação (equipe, comissão, ferramentas) entram pelos lançamentos
        {r?.custosOperacaoCentavos != null && <> — no período: <CurrencyValue centavos={r.custosOperacaoCentavos} /></>}.
      </p>
    </ContentSection>
  );
}
