import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Notice } from '@/components/feedback/Notice';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { retryPolicy, usePagedReport } from '@/hooks/useReport';
import { useTableState } from '@/hooks/useTableState';
import { useUrlSearchParams } from '@/hooks/useUrlSearchParams';
import { formatDateTime } from '@/lib/dates';
import { formatInteger } from '@/lib/formatters';
import { rhService } from '@/services/rh.service';
import type { RhAlteracao, RhTipoAlteracao } from '@/types/rh.types';
import { dia, TIPO_ALTERACAO } from './rh-format';

const TODOS = '__todos__';
const TIPOS = Object.keys(TIPO_ALTERACAO) as RhTipoAlteracao[];

/** Salário vem em centavos como texto; datas e textos seguem como vieram. */
function Valor({ a, v }: { a: RhAlteracao; v: string | null }) {
  if (v === null) return <span className="text-muted-foreground">—</span>;
  if (a.tipo === 'SALARIO' || a.tipo === 'MOVIMENTACAO') return <CurrencyValue centavos={Number(v)} />;
  if (a.campo === 'demissao') return <>{dia(v)}</>;
  return <>{v}</>;
}

/** Acompanha a origem de verdade (sistema de RH): quando foi conferida, o que mudou e se há dois valores para o mesmo salário. */
export default function MonitoramentoPage() {
  const qc = useQueryClient();
  const { rhCan } = usePermissions();
  const { state, update } = useTableState('alt', { limit: 20 });
  const { sp, update: updateUrl } = useUrlSearchParams();
  const tipo = sp.get('tipo') ?? '';

  const m = useQuery({ queryKey: ['rh', 'monitoramento'], retry: retryPolicy, refetchInterval: 60_000, queryFn: async ({ signal }) => (await rhService.monitoramento(signal)).data });
  const alt = usePagedReport('rh', 'alteracoes', rhService.alteracoes, { page: state.page, limit: state.limit, tipo: tipo || undefined }, { autoRefresh: false });

  const conferir = useMutation({
    mutationFn: () => rhService.conferirAgora(false),
    onSuccess: (r) => {
      const x = r.data;
      if (x.situacao === 'SEM_MUDANCA') toast.success('Conferido: nada mudou no sistema de RH.');
      else if (x.situacao === 'SINCRONIZADO') toast.success(x.alteracoes ? `${x.alteracoes} alteração(ões) detectada(s).` : 'Sincronizado, sem alterações.');
      else if (x.situacao === 'OCUPADO') toast.info('Já há uma conferência em andamento.');
      else toast.error('Não foi possível ler o sistema de RH agora.');
      void qc.invalidateQueries({ queryKey: ['rh'] });
    },
    onError: () => toast.error('Não foi possível conferir agora.'),
  });

  const r = m.data;
  if (m.isError && !r) return <ErrorState error={m.error} onRetry={() => void m.refetch()} />;

  const cols: Column<RhAlteracao>[] = [
    { id: 'quando', header: 'Detectada em', mobile: 'title', cell: (a) => formatDateTime(a.detectadaEm) },
    { id: 'quem', header: 'Colaborador', cell: (a) => (a.colaborador?.nome ? <Link to={`/rh/colaboradores/${a.colaborador.id}`} className="font-medium hover:text-primary hover:underline">{a.colaborador.nome}</Link> : '—') },
    { id: 'tipo', header: 'O que mudou', mobile: 'value', cell: (a) => <Badge variant={a.tipo === 'SALARIO' || a.tipo === 'MOVIMENTACAO' ? 'gold' : 'default'}>{TIPO_ALTERACAO[a.tipo]}</Badge> },
    { id: 'campo', header: 'Campo', mobile: 'hidden', cell: (a) => a.campo ?? '—' },
    { id: 'antes', header: 'Antes', align: 'right', cell: (a) => <Valor a={a} v={a.anterior} /> },
    { id: 'depois', header: 'Depois', align: 'right', cell: (a) => <Valor a={a} v={a.novo} /> },
  ];
  const meta = alt.data?.meta;
  const atrasado = !!r && (r.atrasado || r.ultimoStatus === 'ERRO');

  return (
    <>
      <PageHeader
        title="Monitoramento do sistema de RH"
        description="A API confere o sistema de RH a cada poucos minutos e registra aqui qualquer mudança de salário, cargo ou situação."
        actions={rhCan('monitoramento.conferir') ? <Button variant="secondary" disabled={conferir.isPending} onClick={() => conferir.mutate()}><RefreshCw className={conferir.isPending ? 'animate-spin' : undefined} /> Conferir agora</Button> : undefined}
      />

      {r && !r.monitoramentoLigado && <Notice tone="warning">O monitoramento automático está desligado no servidor (origem do RH não configurada ou RH_SYNC_ENABLED=false).</Notice>}
      {r && atrasado && r.monitoramentoLigado && (
        <Notice tone="danger" role="alert">
          {r.ultimoStatus === 'ERRO' ? `A última conferência falhou${r.ultimoErro ? `: ${r.ultimoErro}` : ''}.` : 'A conferência está atrasada.'} Os dados abaixo podem estar desatualizados.
        </Notice>
      )}
      {r && r.inconsistenciasNaOrigem.length > 0 && (
        <Notice tone="warning" role="alert">
          <strong className="font-medium text-foreground">{r.inconsistenciasNaOrigem.length} pessoa(s) com dois valores de salário no sistema de RH:</strong> o salário atual é diferente do último reajuste registrado. Peça ao RH para corrigir lá.
        </Notice>
      )}

      {r && (
        <dl className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Situação</dt>
            <dd className="mt-1">{atrasado ? <Badge variant="negative">Atenção</Badge> : <Badge variant="positive">Em dia</Badge>}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Última conferência</dt>
            <dd className="mt-1 text-sm">{formatDateTime(r.ultimaVerificacaoEm)}{r.minutosDesdeAUltimaVerificacao !== null ? ` (há ${formatInteger(r.minutosDesdeAUltimaVerificacao)} min)` : ''}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Último salvamento na origem</dt>
            <dd className="mt-1 text-sm">{formatDateTime(r.origem.salvaEm)}{r.origem.salvaPor ? ` por ${r.origem.salvaPor}` : ''}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Conferência automática</dt>
            <dd className="mt-1 text-sm">a cada {r.intervaloMinutos} min · {formatInteger(Object.values(r.alteracoesUltimos30Dias).reduce((t, n) => t + (n ?? 0), 0))} alteração(ões) em 30 dias</dd>
          </div>
        </dl>
      )}

      <ContentSection
        title="Alterações detectadas"
        description="Cada mudança feita no sistema de RH, com o valor antes e depois."
        actions={
          <Select value={tipo || TODOS} onValueChange={(v) => updateUrl((prev) => { const n = new URLSearchParams(prev); if (v === TODOS) n.delete('tipo'); else n.set('tipo', v); n.delete('alt.page'); return n; })}>
            <SelectTrigger className="h-9 w-full sm:w-56" aria-label="Tipo de alteração"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os tipos</SelectItem>
              {TIPOS.map((t) => <SelectItem key={t} value={t}>{TIPO_ALTERACAO[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      >
        <DataTable
          caption="Alterações detectadas"
          columns={cols}
          data={alt.data?.data}
          rowKey={(a) => a.id}
          loading={alt.isPending}
          fetching={alt.isFetching && !alt.isPending}
          error={alt.error}
          onRetry={() => void alt.refetch()}
          dense
          empty={{ title: 'Nenhuma alteração detectada ainda.', description: 'Quando o RH mudar um salário ou cargo, aparece aqui.' }}
          pagination={meta && { page: meta.page, limit: meta.limit, total: meta.total, totalPages: meta.totalPages, onPageChange: (page) => update({ page }), onLimitChange: (limit) => update({ limit }) }}
        />
      </ContentSection>
    </>
  );
}
