import { Plus } from 'lucide-react';
import { useState } from 'react';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid } from '@/components/cards/KpiGrid';
import { FinancialBarChart } from '@/components/charts/FinancialBarChart';
import { ErrorState } from '@/components/feedback/ErrorState';
import { FilterToolbar } from '@/components/filters/FilterToolbar';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFilters } from '@/hooks/useFilters';
import { usePermissions } from '@/hooks/usePermissions';
import { usePagedReport } from '@/hooks/useReport';
import { addDays, todaySP } from '@/lib/dates';
import { custosService } from '@/services/custos.service';
import { useWithComparison } from '../shared/useComparison';
import { CostForm } from './CostForm';
import { CostManagementPanel } from './CostManagementPanel';
import { CostsTable } from './CostsTable';

const VENCIDOS_LIMIT = 100;

export default function CustosFixosPage() {
  const { can } = usePermissions();
  const { range } = useFilters();
  const [novo, setNovo] = useState(false);

  const resumo = useWithComparison('custos', 'resumo', (p, s) => custosService.resumo(p, s), { keys: [] });
  // vencidos = pendentes com vencimento anterior a hoje (independente do período da tela)
  const vencidos = usePagedReport('custos', 'vencidos', custosService.listar, { status: 'PENDENTE', de: '2000-01-01', ate: addDays(todaySP(), -1), limit: VENCIDOS_LIMIT, page: 1, sortBy: 'vencimento', sortOrder: 'ASC' });

  const cur = resumo.current;
  const r = cur.data?.data;
  const prev = resumo.comparison.data?.data;
  const cmp = (p: number | undefined) => (resumo.hasComparison ? { previous: p, loading: resumo.comparison.isPending } : undefined);
  const venc = vencidos.data;
  const vencTotal = venc?.meta.total;
  const vencSoma = venc && venc.meta.total <= VENCIDOS_LIMIT ? venc.data.reduce((s, c) => s + c.valorCentavos, 0) : undefined;

  if (cur.isError && !cur.data) {
    return (<><FilterToolbar showCriterio={false} extras={[]} /><ErrorState error={cur.error} onRetry={() => void cur.refetch()} /></>);
  }

  return (
    <>
      <PageHeader
        title="Custos fixos"
        description="Despesas da operação e suas recorrências. O período filtra pelo vencimento."
        actions={can('custos.write') ? <Button onClick={() => setNovo(true)}><Plus /> Novo custo</Button> : undefined}
      />
      <FilterToolbar showCriterio={false} extras={[]} />

      <KpiGrid cols={5}>
        <KpiCard label="Total de custos" value={r?.totalLancamentosCentavos} loading={cur.isPending} highlight hero polarity="down-is-good" comparison={cmp(prev?.totalLancamentosCentavos)} description={r ? `${r.ocorrencias} ocorrências no período` : undefined} />
        <KpiCard label="Pagos" value={r?.pagoCentavos} loading={cur.isPending} comparison={cmp(prev?.pagoCentavos)} />
        <KpiCard label="Pendentes" value={r?.pendenteCentavos} loading={cur.isPending} polarity="down-is-good" comparison={cmp(prev?.pendenteCentavos)} />
        <KpiCard
          label="Vencidos"
          value={vencidos.isError ? undefined : vencSoma}
          unavailableReason={vencTotal !== undefined && vencSoma === undefined ? `${vencTotal} custos vencidos (mais de ${VENCIDOS_LIMIT}: valor total indisponível)` : vencidos.isError ? 'Não foi possível consultar' : undefined}
          loading={vencidos.isPending}
          polarity="down-is-good"
          valueTone={vencTotal ? 'negative' : 'default'}
          description={vencTotal !== undefined ? `${vencTotal} custos pendentes com vencimento anterior a hoje` : undefined}
        />
        <KpiCard
          label="Previstos"
          format="integer"
          value={r?.projetadas}
          loading={cur.isPending}
          description="Ocorrências futuras de recorrências, projetadas pelo servidor no período"
        />
      </KpiGrid>

      <FinancialBarChart
        title="Custos por categoria"
        description="Lançamentos com vencimento no período"
        data={(r?.porCategoria ?? []).map((c) => ({ label: c.categoria, value: c.totalCentavos }))}
        loading={cur.isPending}
        error={cur.error}
        onRetry={() => void cur.refetch()}
        valueLabel="Custo"
      />

      <ContentSection title="Lançamentos" description={`Vencimentos de ${range.de.split('-').reverse().join('/')} a ${range.ate.split('-').reverse().join('/')}`}>
        <CostsTable id="fixos" title="Custos fixos" />
      </ContentSection>

      <CostManagementPanel />

      <Dialog open={novo} onOpenChange={setNovo}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>Novo custo</DialogTitle><DialogDescription>O lançamento é gravado no servidor e passa a compor o resultado operacional.</DialogDescription></DialogHeader>
          <CostForm onSaved={() => setNovo(false)} onCancel={() => setNovo(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
