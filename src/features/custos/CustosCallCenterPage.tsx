import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { ErrorState } from '@/components/feedback/ErrorState';
import { FilterToolbar } from '@/components/filters/FilterToolbar';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFilters } from '@/hooks/useFilters';
import { usePermissions } from '@/hooks/usePermissions';
import { usePagedReport, useReport } from '@/hooks/useReport';
import { formatInteger } from '@/lib/formatters';
import { custosService } from '@/services/custos.service';
import { CostForm } from './CostForm';
import { CostManagementPanel } from './CostManagementPanel';
import { CostsTable } from './CostsTable';

const GRUPO = 'CALL_CENTER';

/** Lançamento e controle dos custos operacionais do Call Center (grupo CALL_CENTER). */
export default function CustosCallCenterPage() {
  const { can } = usePermissions();
  const { range } = useFilters();
  const params = { de: range.de, ate: range.ate, grupo: GRUPO };

  const resumo = useReport('custos', 'resumo#call-center', (p, s) => custosService.resumo(p, s), params);
  const contagem = usePagedReport('custos', 'contagem#call-center', custosService.listar, { ...params, limit: 1, page: 1 });
  const total = resumo.data?.data.totalLancamentosCentavos;
  const n = contagem.data?.meta.total;

  return (
    <>
      <PageHeader title="Call Center — Lançamentos" description="Custos operacionais do Call Center. Eles compõem a sobra e a margem exibidas na página Call Center." />
      <FilterToolbar showCriterio={false} extras={[]} />

      <Card>
        <CardContent className="flex flex-wrap items-end justify-between gap-3 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total</p>
            {resumo.isPending ? <Skeleton className="mt-2 h-8 w-36" /> : resumo.isError ? <ErrorState error={resumo.error} compact onRetry={() => void resumo.refetch()} /> : (
              <p className="tabular mt-1 text-[28px] font-semibold text-primary"><CurrencyValue centavos={total} /></p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{contagem.isPending ? 'Contando…' : `${formatInteger(n)} lançamento${n === 1 ? '' : 's'} no período`}</p>
          </div>
          {resumo.data && <p className="max-w-md text-[11px] text-muted-foreground">{resumo.data.data.metodologia}</p>}
        </CardContent>
      </Card>

      {can('custos.write') && (
        <Card>
          <CardHeader>
            <CardTitle>Novo lançamento</CardTitle>
            <CardDescription>PDF ou imagem de até 5 MB. O anexo fica em armazenamento privado.</CardDescription>
          </CardHeader>
          <CardContent>
            <CostForm grupo={GRUPO} submitLabel="Lançar" />
          </CardContent>
        </Card>
      )}

      <ContentSection title="Lançamentos">
        <CostsTable id="cc-custos" fixed={{ grupo: GRUPO }} grupo={GRUPO} title="Lançamentos do Call Center" />
      </ContentSection>

      <CostManagementPanel />
    </>
  );
}
