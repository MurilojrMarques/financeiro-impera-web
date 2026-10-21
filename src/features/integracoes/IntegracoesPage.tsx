import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KpiGrid } from '@/components/cards/KpiGrid';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OutdatedDataWarning, RelativeTime } from '@/components/feedback/OutdatedDataWarning';
import { ConfirmDialog } from '@/components/forms/ConfirmDialog';
import { ContentSection } from '@/components/layout/ContentSection';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { useIntegracaoStatus } from '@/hooks/useIntegracaoStatus';
import { usePermissions } from '@/hooks/usePermissions';
import { retryPolicy, usePagedReport } from '@/hooks/useReport';
import { useTableState } from '@/hooks/useTableState';
import { formatDateTime } from '@/lib/dates';
import { formatDuration, formatInteger } from '@/lib/formatters';
import { integracoesService } from '@/services/integracoes.service';
import { ApiError } from '@/types/api.types';
import type { ErroImportacao, Execucao, FonteStatus } from '@/types/financial.types';

type Aba = 'EVENTOS' | 'HISTORICO' | 'REDTRACK' | 'execucoes' | 'erros';
const ESTADO_VARIANT: Record<string, 'positive' | 'warning' | 'negative' | 'info' | 'default'> = {
  ATUALIZADA: 'positive', ATUALIZADA_COM_ERROS: 'warning', NUNCA_SINCRONIZADA: 'default',
  CREDENCIAIS_INVALIDAS: 'negative', PLANILHA_INACESSIVEL: 'negative', ABA_INEXISTENTE: 'negative', CABECALHO_OBRIGATORIO_AUSENTE: 'negative', INDISPONIVEL: 'warning', ERRO: 'negative',
};
const ESTADO_LABEL: Record<string, string> = {
  ATUALIZADA: 'Atualizada', ATUALIZADA_COM_ERROS: 'Atualizada com erros', NUNCA_SINCRONIZADA: 'Nunca sincronizada', CREDENCIAIS_INVALIDAS: 'Credenciais inválidas',
  PLANILHA_INACESSIVEL: 'Planilha inacessível', ABA_INEXISTENTE: 'Aba inexistente', CABECALHO_OBRIGATORIO_AUSENTE: 'Cabeçalho obrigatório ausente', INDISPONIVEL: 'Google indisponível', ERRO: 'Erro',
};
const EXEC_VARIANT = { SUCESSO: 'positive', PARCIAL: 'warning', FALHA: 'negative', EXECUTANDO: 'info' } as const;

function triggerError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 409) return 'Já existe uma sincronização em andamento. Aguarde terminar.';
    if (e.status === 429) return 'Muitos acionamentos seguidos. Aguarde um minuto.';
    if (e.status === 503) return 'A integração com o Google Sheets não está configurada no servidor.';
    if (e.isForbidden) return 'Somente administradores podem acionar a sincronização.';
  }
  return 'Não foi possível iniciar a sincronização.';
}

/** Previsão APROXIMADA: última leitura + intervalo configurado (só para fontes de cadência fixa). */
function proximaPrevista(f: FonteStatus): string | null {
  if (f.fonte === 'HISTORICO' || !f.ultimaLeituraEm || !f.intervaloSegundos) return null;
  return formatDateTime(new Date(new Date(f.ultimaLeituraEm).getTime() + f.intervaloSegundos * 1000).toISOString());
}

export default function IntegracoesPage() {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const admin = can('integracoes.executar');
  const [fast, setFast] = useState(false);
  const status = useIntegracaoStatus(true, fast);
  const [aba, setAba] = useState<Aba>('EVENTOS');
  const [confirm, setConfirm] = useState<'sincronizar' | 'reconciliar' | null>(null);
  const exec = useTableState('exec', { limit: 20 });
  const err = useTableState('err', { limit: 20 });

  useEffect(() => {
    if (!fast) return;
    const t = setTimeout(() => setFast(false), 90_000);
    return () => clearTimeout(t);
  }, [fast]);

  const s = status.data;
  const sincronizando = !!s?.sincronizandoAgora;

  const trigger = useMutation({
    mutationFn: (tipo: 'sincronizar' | 'reconciliar') => (tipo === 'sincronizar' ? integracoesService.sincronizar() : integracoesService.reconciliar()),
    onSuccess: (_r, tipo) => {
      toast.success(tipo === 'sincronizar' ? 'Sincronização iniciada. Os dados serão atualizados em instantes.' : 'Reconciliação completa iniciada. Pode levar alguns minutos.');
      setConfirm(null);
      setFast(true);
      void qc.invalidateQueries({ queryKey: ['integracoes'] });
    },
    onError: (e) => {
      toast.error(triggerError(e));
      setConfirm(null);
      void qc.invalidateQueries({ queryKey: ['integracoes'] });
    },
  });

  const execucoes = usePagedReport('integracoes', 'execucoes', integracoesService.execucoes, { page: exec.state.page, limit: exec.state.limit, ...(['EVENTOS', 'HISTORICO', 'REDTRACK'].includes(aba) ? { fonte: aba } : {}) }, { enabled: admin && (aba === 'execucoes' || ['EVENTOS', 'HISTORICO', 'REDTRACK'].includes(aba)), autoRefresh: false });
  const erros = usePagedReport('integracoes', 'erros', integracoesService.erros, { page: err.state.page, limit: err.state.limit }, { enabled: admin && aba === 'erros', autoRefresh: false });
  const fontes = useQuery({ queryKey: ['integracoes', 'fontes'], enabled: admin, retry: retryPolicy, queryFn: async ({ signal }) => (await integracoesService.fontes({}, signal)).data });

  const colsExec: Column<Execucao>[] = [
    { id: 'fonte', header: 'Fonte', mobile: 'title', cell: (x) => x.fonte },
    { id: 'modo', header: 'Modo', cell: (x) => x.modo },
    { id: 'status', header: 'Status', mobile: 'value', cell: (x) => <Badge variant={EXEC_VARIANT[x.status]}>{x.status}</Badge> },
    { id: 'ini', header: 'Início', cell: (x) => formatDateTime(x.iniciadaEm) },
    { id: 'dur', header: 'Duração', align: 'right', cell: (x) => formatDuration(x.duracaoMs) },
    { id: 'lidos', header: 'Lidos', align: 'right', cell: (x) => formatInteger(x.lidos) },
    { id: 'ins', header: 'Novos', align: 'right', cell: (x) => formatInteger(x.inseridos) },
    { id: 'atu', header: 'Atualizados', align: 'right', cell: (x) => formatInteger(x.atualizados) },
    { id: 'ign', header: 'Ignorados', align: 'right', cell: (x) => formatInteger(x.ignorados) },
    { id: 'err', header: 'Erros', align: 'right', cell: (x) => (x.comErro > 0 ? <span className="text-negative">{formatInteger(x.comErro)}</span> : '0') },
    { id: 'por', header: 'Origem', cell: (x) => <span className="text-xs text-muted-foreground">{x.disparadaPor.startsWith('manual') ? 'manual' : x.disparadaPor}</span> },
    { id: 'msg', header: 'Mensagem', mobile: 'full', cell: (x) => <span className="block max-w-56 truncate text-xs text-muted-foreground max-md:max-w-none max-md:whitespace-normal" title={x.erro ?? undefined}>{x.erro ?? '—'}</span> },
  ];
  const colsErr: Column<ErroImportacao>[] = [
    { id: 'fonte', header: 'Fonte', mobile: 'title', cell: (x) => x.fonte },
    { id: 'linha', header: 'Linha', align: 'right', cell: (x) => x.linhaOrigem ?? '—' },
    { id: 'cod', header: 'Código', mobile: 'value', cell: (x) => <Badge variant="warning">{x.codigo}</Badge> },
    { id: 'campo', header: 'Campo', cell: (x) => x.campo ?? '—' },
    { id: 'msg', header: 'Mensagem', mobile: 'full', cell: (x) => x.mensagem },
    { id: 'em', header: 'Registrado em', cell: (x) => formatDateTime(x.criadoEm) },
  ];

  const fonteAtual = s?.fontes.find((f) => f.fonte === aba);
  const ultima = execucoes.data?.data[0];
  const fonteDetalhe = fontes.data?.find((f) => f.fonte === aba);
  const em = execucoes.data?.meta;
  const er = erros.data?.meta;

  return (
    <>
      <PageHeader
        title="Integrações e sincronização"
        description="Estado da leitura da planilha Google Sheets. O dashboard consulta sempre o banco de dados, nunca a planilha."
        actions={
          admin ? (
            <>
              <Button variant="secondary" onClick={() => setConfirm('sincronizar')} disabled={sincronizando || trigger.isPending}>
                {sincronizando || trigger.isPending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Sincronizar agora
              </Button>
              <Button variant="outline" onClick={() => setConfirm('reconciliar')} disabled={sincronizando || trigger.isPending}>Reconciliação completa</Button>
            </>
          ) : undefined
        }
      />
      <OutdatedDataWarning lastSync={s?.ultimaSincronizacao} outdated={s?.dadosDesatualizados} fetchFailed={status.isError && !!s} />
      {status.isError && !s ? (
        <ErrorState error={status.error} onRetry={() => void status.refetch()} />
      ) : (
        <>
          <KpiGrid cols={3}>
            <Card className="flex flex-col justify-between p-4">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Estado geral</h3>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
                {sincronizando ? <><LoaderCircle className="size-5 animate-spin text-info" /> Sincronizando</> : s?.estado === 'ATUALIZADO' ? <><CircleCheck className="size-5 text-positive" /> Atualizado</> : s ? <><TriangleAlert className="size-5 text-warning" /> {s.estado === 'NUNCA_SINCRONIZADO' ? 'Nunca sincronizado' : s.estado === 'ERRO' ? 'Com erro' : 'Desatualizado'}</> : '—'}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Desatualizado após {s ? Math.round(s.limiteDesatualizadoSegundos / 60) : '—'} min sem sincronizar</p>
            </Card>
            <Card className="flex flex-col justify-between p-4">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Última sincronização</h3>
              <p className="mt-2 text-lg font-semibold">{s?.ultimaSincronizacao ? <RelativeTime iso={s.ultimaSincronizacao} /> : 'nunca'}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(s?.ultimaSincronizacao)}</p>
            </Card>
            <Card className="flex flex-col justify-between p-4">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Em execução</h3>
              <p className="mt-2 text-lg font-semibold">{s?.sincronizandoAgora ? s.sincronizandoAgora.fonte : 'Nenhuma'}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s?.sincronizandoAgora ? `desde ${formatDateTime(s.sincronizandoAgora.desde)}` : 'Não é possível executar duas sincronizações ao mesmo tempo'}</p>
            </Card>
          </KpiGrid>

          <div className="no-print">
            <Segmented
              label="Fonte ou histórico"
              value={aba}
              onChange={setAba}
              options={[
                { value: 'EVENTOS', label: 'EVENTOS' }, { value: 'HISTORICO', label: 'HISTORICO' }, { value: 'REDTRACK', label: 'REDTRACK' },
                ...(admin ? [{ value: 'execucoes' as Aba, label: 'Histórico de sincronizações' }, { value: 'erros' as Aba, label: 'Erros e pendências' }] : []),
              ]}
            />
          </div>

          {['EVENTOS', 'HISTORICO', 'REDTRACK'].includes(aba) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Aba {aba}
                  {fonteAtual && <Badge variant={ESTADO_VARIANT[fonteAtual.estado] ?? 'default'}>{ESTADO_LABEL[fonteAtual.estado] ?? fonteAtual.estado}</Badge>}
                </CardTitle>
                <CardDescription>{aba === 'EVENTOS' ? 'Webhook Pagah ao vivo' : aba === 'HISTORICO' ? 'Exportação do painel (importada na primeira execução e reconciliada diariamente)' : 'Conciliação com o RedTrack'}</CardDescription>
              </CardHeader>
              <CardContent>
                {!fonteAtual ? (
                  <p className="text-sm text-muted-foreground">Esta fonte ainda não foi sincronizada.</p>
                ) : (
                  <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
                    <Info label="Último sucesso" value={formatDateTime(fonteAtual.ultimoSucessoEm)} />
                    <Info label="Última leitura" value={formatDateTime(fonteAtual.ultimaLeituraEm)} />
                    <Info label="Intervalo" value={fonteAtual.fonte === 'HISTORICO' ? 'Reconciliação diária' : `${fonteAtual.intervaloSegundos} s`} />
                    <Info label="Próxima prevista (aprox.)" value={proximaPrevista(fonteAtual) ?? 'não aplicável'} />
                    {admin && ultima && (
                      <>
                        <Info label="Registros lidos" value={formatInteger(ultima.lidos)} />
                        <Info label="Novos / atualizados" value={`${formatInteger(ultima.inseridos)} / ${formatInteger(ultima.atualizados)}`} />
                        <Info label="Erros" value={formatInteger(ultima.comErro)} />
                        <Info label="Duração" value={formatDuration(ultima.duracaoMs)} />
                      </>
                    )}
                    {admin && fonteDetalhe && <Info label="Cursor (última linha)" value={formatInteger(fonteDetalhe.cursorUltimaLinha)} />}
                  </dl>
                )}
                {fonteAtual?.ultimoErro && <p role="alert" className="mt-3 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-negative">{fonteAtual.ultimoErro}</p>}
                {admin && fonteDetalhe?.cabecalhosOpcionaisAusentes && fonteDetalhe.cabecalhosOpcionaisAusentes.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">Colunas opcionais ausentes na planilha: {fonteDetalhe.cabecalhosOpcionaisAusentes.join(', ')}</p>
                )}
                {admin && fonteDetalhe?.cabecalhosReconhecidos && (
                  <details className="mt-2 text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Cabeçalhos reconhecidos ({fonteDetalhe.cabecalhosReconhecidos.length})</summary>
                    <p className="mt-1 break-words">{fonteDetalhe.cabecalhosReconhecidos.join(', ')}</p>
                  </details>
                )}
              </CardContent>
            </Card>
          )}

          {admin && aba === 'execucoes' && (
            <ContentSection title="Histórico de sincronizações">
              <DataTable
                caption="Histórico de sincronizações" columns={colsExec} data={execucoes.data?.data} rowKey={(x) => x.id}
                loading={execucoes.isPending} fetching={execucoes.isFetching && !execucoes.isPending} error={execucoes.error} onRetry={() => void execucoes.refetch()}
                empty={{ title: 'Nenhuma sincronização registrada ainda.' }} dense
                pagination={em && { page: em.page, limit: em.limit, total: em.total, totalPages: em.totalPages, onPageChange: (page) => exec.update({ page }), onLimitChange: (limit) => exec.update({ limit }) }}
              />
            </ContentSection>
          )}
          {admin && aba === 'erros' && (
            <ContentSection title="Erros e pendências" description="Linhas que não puderam ser importadas. As mensagens não contêm o valor da célula.">
              <DataTable
                caption="Erros de importação" columns={colsErr} data={erros.data?.data} rowKey={(x) => x.id}
                loading={erros.isPending} fetching={erros.isFetching && !erros.isPending} error={erros.error} onRetry={() => void erros.refetch()}
                empty={{ title: 'Nenhum erro de importação.' }} dense
                pagination={er && { page: er.page, limit: er.limit, total: er.total, totalPages: er.totalPages, onPageChange: (page) => err.update({ page }), onLimitChange: (limit) => err.update({ limit }) }}
              />
            </ContentSection>
          )}
          {!admin && <p className="text-xs text-muted-foreground">Histórico de execuções, erros e ações manuais são restritos a administradores.</p>}
        </>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === 'reconciliar' ? 'Executar reconciliação completa?' : 'Sincronizar agora?'}
        description={confirm === 'reconciliar'
          ? 'Relê as três abas inteiras e recalcula as vendas. Pode levar vários minutos e não pode ser executada junto com outra sincronização.'
          : 'Lê as alterações recentes das abas agora, sem esperar o ciclo automático.'}
        confirmLabel={confirm === 'reconciliar' ? 'Executar reconciliação' : 'Sincronizar'}
        loading={trigger.isPending}
        onConfirm={() => confirm && trigger.mutate(confirm)}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
