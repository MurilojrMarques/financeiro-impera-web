import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Download, LoaderCircle, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { FileUpload, validateFile } from '@/components/forms/FileUpload';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid } from '@/components/cards/KpiGrid';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { retryPolicy, usePagedReport } from '@/hooks/useReport';
import { useTableState } from '@/hooks/useTableState';
import { useUrlSearchParams } from '@/hooks/useUrlSearchParams';
import { formatBytes } from '@/lib/formatters';
import { rhService } from '@/services/rh.service';
import { ApiError } from '@/types/api.types';
import type { RhDocumento, RhNotasResumoItem, RhTipoDocumento } from '@/types/rh.types';
import { baixar, dia, mesAtual, mesLabel, STATUS_DOC, TIPO_DOC } from './rh-format';

const MAX_RH = 10 * 1024 * 1024;
const TODOS = '__todos__';
const TIPOS = Object.keys(TIPO_DOC) as RhTipoDocumento[];

function EnviarDialog({ open, onOpenChange, colaboradorFixo }: { open: boolean; onOpenChange: (o: boolean) => void; colaboradorFixo?: string }) {
  const qc = useQueryClient();
  const { rhCan } = usePermissions();
  const ehRh = rhCan('documentos.revisar');
  const [tipo, setTipo] = useState<RhTipoDocumento>(ehRh ? 'COMPROVANTE_PAGAMENTO' : 'NOTA_FISCAL');
  const [colaboradorId, setColaboradorId] = useState(colaboradorFixo ?? '');
  const [competencia, setCompetencia] = useState(mesAtual());
  const [valor, setValor] = useState<number | null>(null);
  const [descricao, setDescricao] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const pessoas = useQuery({
    queryKey: ['rh', 'colaboradores-ativos'],
    enabled: open && ehRh && !colaboradorFixo,
    staleTime: 5 * 60_000,
    retry: retryPolicy,
    queryFn: async ({ signal }) => (await rhService.colaboradores({ limit: 100, ativo: true }, signal)).data,
  });

  const enviar = useMutation({
    mutationFn: () => rhService.enviarDocumento(arquivo!, { tipo, competencia: competencia || undefined, valorCentavos: valor ?? undefined, descricao: descricao.trim() || undefined, ...(ehRh ? { colaboradorId } : {}) }),
    onSuccess: () => {
      toast.success('Documento enviado.');
      void qc.invalidateQueries({ queryKey: ['rh', 'documentos'] });
      setArquivo(null);
      setValor(null);
      setDescricao('');
      setErro(null);
      onOpenChange(false);
    },
    onError: (e) => setErro(e instanceof ApiError && [403, 404, 413, 422].includes(e.status ?? 0) ? e.message : 'Não foi possível enviar. Tente novamente.'),
  });

  const submit = () => {
    if (ehRh && !colaboradorId) return setErro('Escolha o colaborador.');
    if (!arquivo) return setErro('Anexe o arquivo.');
    const v = validateFile(arquivo, MAX_RH);
    if (v) return setErro(v);
    setErro(null);
    enviar.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ehRh ? 'Enviar documento' : 'Enviar minha nota fiscal'}</DialogTitle>
          <DialogDescription>{ehRh ? 'Comprovantes, contratos e notas ficam guardados no servidor, sem ir para o Git.' : 'Envie o PDF (ou foto) da nota fiscal do mês. O RH confere e aprova.'}</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {ehRh && (
            <>
              <div className="space-y-1">
                <Label htmlFor="d-tipo">Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as RhTipoDocumento)}>
                  <SelectTrigger id="d-tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{TIPO_DOC[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {!colaboradorFixo && (
                <div className="space-y-1">
                  <Label htmlFor="d-colab">Colaborador</Label>
                  <Select value={colaboradorId} onValueChange={setColaboradorId}>
                    <SelectTrigger id="d-colab"><SelectValue placeholder="Escolha…" /></SelectTrigger>
                    <SelectContent>{(pessoas.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="d-mes">Mês de referência</Label>
              <Input id="d-mes" type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-valor">Valor (opcional)</Label>
              <MoneyInput id="d-valor" value={valor} onValueChange={setValor} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-desc">Observação (opcional)</Label>
            <Input id="d-desc" value={descricao} maxLength={300} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-arq">Arquivo</Label>
            <FileUpload id="d-arq" file={arquivo} onChange={setArquivo} maxBytes={MAX_RH} error={erro && !arquivo ? erro : null} />
          </div>
          {erro && <p role="alert" className="text-sm text-negative">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={enviar.isPending}>{enviar.isPending && <LoaderCircle className="animate-spin" />} Enviar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReprovarDialog({ doc, onClose }: { doc: RhDocumento | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [motivo, setMotivo] = useState('');
  const m = useMutation({
    mutationFn: () => rhService.revisarDocumento(doc!.id, 'REPROVADO', motivo.trim()),
    onSuccess: () => {
      toast.success('Documento reprovado.');
      void qc.invalidateQueries({ queryKey: ['rh', 'documentos'] });
      setMotivo('');
      onClose();
    },
    onError: () => toast.error('Não foi possível reprovar.'),
  });
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprovar documento</DialogTitle>
          <DialogDescription>{doc ? `${TIPO_DOC[doc.tipo]} de ${doc.colaborador.nome}` : ''}. O colaborador vê o motivo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="rep-motivo">Motivo</Label>
          <Input id="rep-motivo" value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: valor diferente da folha" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={motivo.trim().length < 3 || m.isPending} onClick={() => m.mutate()}>Reprovar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Lista de documentos (com envio, download e revisão). `fixo`: ficha de uma pessoa (sem filtros nem coluna de nome). */
export function DocumentosLista({ colaboradorId, fixo }: { colaboradorId?: string; fixo?: boolean }) {
  const qc = useQueryClient();
  const { rhCan, rhPapel } = usePermissions();
  const { user } = useAuth();
  const ehRh = rhCan('documentos.revisar');
  const verTodos = rhPapel === 'RH' || rhPapel === 'CEO';
  // quem não é RH só envia a PRÓPRIA nota: precisa ter cadastro de colaborador
  const podeEnviar = ehRh || !!user?.colaboradorId;
  const { state, update } = useTableState(fixo ? 'docf' : 'doc', { limit: 20 });
  const { sp, update: updateUrl } = useUrlSearchParams();
  const competencia = fixo ? '' : (sp.get('competencia') ?? '');
  const tipo = fixo ? '' : (sp.get('tipo') ?? '');
  const status = fixo ? '' : (sp.get('status') ?? '');
  const colaboradorFiltro = fixo ? (colaboradorId ?? '') : (sp.get('colaborador') ?? '');
  const pessoasFiltro = useQuery({
    queryKey: ['rh', 'colaboradores-filtro'],
    enabled: !fixo && verTodos,
    staleTime: 5 * 60_000,
    retry: retryPolicy,
    queryFn: async ({ signal }) => (await rhService.colaboradores({ limit: 100 }, signal)).data,
  });
  const [enviar, setEnviar] = useState(false);
  const [reprovar, setReprovar] = useState<RhDocumento | null>(null);

  const q = usePagedReport(
    'rh',
    'documentos',
    rhService.documentos,
    { page: state.page, limit: state.limit, colaboradorId: colaboradorFiltro || undefined, competencia: competencia || undefined, tipo: tipo || undefined, status: status || undefined },
    { autoRefresh: false },
  );

  const setFiltro = (k: string, v: string) => {
    updateUrl((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set(k, v);
      else next.delete(k);
      next.delete('doc.page');
      return next;
    });
  };

  const baixarDoc = useMutation({
    mutationFn: async (d: RhDocumento) => baixar(await rhService.baixarDocumento(d.id), d.arquivoNome),
    onError: () => toast.error('Não foi possível baixar o arquivo.'),
  });
  const aprovar = useMutation({
    mutationFn: (d: RhDocumento) => rhService.revisarDocumento(d.id, 'APROVADO'),
    onSuccess: () => {
      toast.success('Documento aprovado.');
      void qc.invalidateQueries({ queryKey: ['rh', 'documentos'] });
    },
    onError: () => toast.error('Não foi possível aprovar.'),
  });

  const cols: Column<RhDocumento>[] = [
    ...(!fixo && verTodos ? [{ id: 'colab', header: 'Colaborador', mobile: 'title' as const, cell: (d: RhDocumento) => <span className="font-medium">{d.colaborador.nome}</span> }] : []),
    { id: 'tipo', header: 'Tipo', mobile: fixo || !verTodos ? ('title' as const) : undefined, cell: (d) => TIPO_DOC[d.tipo] },
    { id: 'mes', header: 'Mês', cell: (d) => mesLabel(d.competencia) },
    { id: 'valor', header: 'Valor', align: 'right', cell: (d) => (d.valorCentavos === null ? '—' : <CurrencyValue centavos={d.valorCentavos} />) },
    { id: 'arq', header: 'Arquivo', mobile: 'full', cell: (d) => <span className="block max-w-56 truncate" title={d.arquivoNome}>{d.arquivoNome} <span className="text-xs text-muted-foreground">({formatBytes(d.tamanhoBytes)})</span></span> },
    { id: 'em', header: 'Enviado em', cell: (d) => dia(d.criadoEm) },
    {
      id: 'status',
      header: 'Situação',
      mobile: 'value',
      cell: (d) => (
        <span className="flex flex-col items-start gap-1">
          <Badge variant={STATUS_DOC[d.status].variant}>{STATUS_DOC[d.status].label}</Badge>
          {d.motivoReprovacao && <span className="max-w-48 text-xs text-negative">{d.motivoReprovacao}</span>}
        </span>
      ),
    },
    {
      id: 'acoes',
      header: 'Ações',
      align: 'right',
      mobile: 'actions',
      cell: (d) => (
        <span className="flex flex-wrap justify-end gap-1">
          <Button variant="ghost" size="sm" disabled={baixarDoc.isPending} onClick={() => baixarDoc.mutate(d)}><Download /> Baixar</Button>
          {ehRh && d.status === 'ENVIADO' && (
            <>
              <Button variant="ghost" size="sm" disabled={aprovar.isPending} onClick={() => aprovar.mutate(d)}><Check /> Aprovar</Button>
              <Button variant="ghost" size="sm" className="text-negative" onClick={() => setReprovar(d)}><X /> Reprovar</Button>
            </>
          )}
        </span>
      ),
    },
  ];
  const meta = q.data?.meta;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {!fixo ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input type="month" aria-label="Mês de referência" value={competencia} onChange={(e) => setFiltro('competencia', e.target.value)} className="h-9 w-full sm:w-44" />
            {verTodos && (
              <Select value={colaboradorFiltro || TODOS} onValueChange={(v) => setFiltro('colaborador', v === TODOS ? '' : v)}>
                <SelectTrigger className="h-9 w-full sm:w-60" aria-label="Colaborador"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos os colaboradores</SelectItem>
                  {(pessoasFiltro.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={tipo || TODOS} onValueChange={(v) => setFiltro('tipo', v === TODOS ? '' : v)}>
              <SelectTrigger className="h-9 w-full sm:w-56" aria-label="Tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os tipos</SelectItem>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{TIPO_DOC[t]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status || TODOS} onValueChange={(v) => setFiltro('status', v === TODOS ? '' : v)}>
              <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Situação"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas as situações</SelectItem>
                {(Object.keys(STATUS_DOC) as (keyof typeof STATUS_DOC)[]).map((s) => <SelectItem key={s} value={s}>{STATUS_DOC[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : <span />}
        {podeEnviar && <Button onClick={() => setEnviar(true)} className="max-sm:w-full"><Upload /> {ehRh ? 'Enviar documento' : 'Enviar nota fiscal'}</Button>}
      </div>
      <DataTable
        caption="Documentos"
        columns={cols}
        data={q.data?.data}
        rowKey={(d) => d.id}
        loading={q.isPending}
        fetching={q.isFetching && !q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        dense
        empty={{ title: 'Nenhum documento encontrado.', description: ehRh ? undefined : 'Envie a sua nota fiscal do mês.' }}
        pagination={meta && { page: meta.page, limit: meta.limit, total: meta.total, totalPages: meta.totalPages, onPageChange: (page) => update({ page }), onLimitChange: (limit) => update({ limit }) }}
      />
      <EnviarDialog open={enviar} onOpenChange={setEnviar} colaboradorFixo={fixo ? colaboradorId : undefined} />
      <ReprovarDialog doc={reprovar} onClose={() => setReprovar(null)} />
    </div>
  );
}

/** Visão do mês: quem já enviou a nota fiscal e quem falta, com valor, situação e comprovante. Só RH e CEO (o administrador entra como CEO). */
function NotasDoMes() {
  const qc = useQueryClient();
  const { rhCan } = usePermissions();
  const ehRh = rhCan('documentos.revisar');
  const { sp, update } = useUrlSearchParams();
  const mes = sp.get('mes') ?? mesAtual();
  const q = useQuery({
    queryKey: ['rh', 'documentos', 'resumo', mes],
    retry: retryPolicy,
    queryFn: async ({ signal }) => (await rhService.notasResumo(mes, signal)).data,
  });
  const baixarNota = useMutation({
    mutationFn: async (i: RhNotasResumoItem) => baixar(await rhService.baixarDocumento(i.nota!.id), i.nota!.arquivoNome),
    onError: () => toast.error('Não foi possível baixar o arquivo.'),
  });
  const aprovar = useMutation({
    mutationFn: (i: RhNotasResumoItem) => rhService.revisarDocumento(i.nota!.id, 'APROVADO'),
    onSuccess: () => {
      toast.success('Nota aprovada.');
      void qc.invalidateQueries({ queryKey: ['rh', 'documentos'] });
    },
    onError: () => toast.error('Não foi possível aprovar.'),
  });
  const d = q.data;
  const cols: Column<RhNotasResumoItem>[] = [
    { id: 'nome', header: 'Colaborador', mobile: 'title', sortable: true, sortValue: (i) => i.nome, cell: (i) => <span className="font-medium">{i.nome}</span> },
    { id: 'depto', header: 'Área', cell: (i) => i.departamento ?? '—' },
    {
      id: 'sit',
      header: 'Nota fiscal',
      mobile: 'value',
      sortable: true,
      sortValue: (i) => (i.nota ? i.nota.status : 'FALTANDO'),
      cell: (i) =>
        i.nota ? (
          <span className="flex flex-col items-start gap-1">
            <Badge variant={STATUS_DOC[i.nota.status].variant}>{STATUS_DOC[i.nota.status].label}</Badge>
            {i.nota.motivoReprovacao && <span className="max-w-48 text-xs text-negative">{i.nota.motivoReprovacao}</span>}
          </span>
        ) : (
          <Badge variant="warning">Faltando</Badge>
        ),
    },
    { id: 'valor', header: 'Valor', align: 'right', sortable: true, sortValue: (i) => i.nota?.valorCentavos ?? -1, cell: (i) => (i.nota?.valorCentavos == null ? '—' : <CurrencyValue centavos={i.nota.valorCentavos} />) },
    { id: 'em', header: 'Enviada em', cell: (i) => (i.nota ? dia(i.nota.criadoEm) : '—') },
    { id: 'comp', header: 'Comprovante', cell: (i) => (i.comprovante ? <Badge variant="positive">Enviado</Badge> : <span className="text-muted-foreground">—</span>) },
    {
      id: 'acoes',
      header: 'Ações',
      align: 'right',
      mobile: 'actions',
      cell: (i) =>
        i.nota ? (
          <span className="flex flex-wrap justify-end gap-1">
            <Button variant="ghost" size="sm" disabled={baixarNota.isPending} onClick={() => baixarNota.mutate(i)}><Download /> Baixar</Button>
            {ehRh && i.nota.status === 'ENVIADO' && <Button variant="ghost" size="sm" disabled={aprovar.isPending} onClick={() => aprovar.mutate(i)}><Check /> Aprovar</Button>}
          </span>
        ) : null,
    },
  ];
  return (
    <div className="space-y-4">
      <Input
        type="month"
        aria-label="Mês de referência"
        value={mes}
        onChange={(e) => update((prev) => { const n = new URLSearchParams(prev); n.set('mes', e.target.value || mesAtual()); return n; })}
        className="h-9 w-full sm:w-44"
      />
      <KpiGrid cols={4}>
        <KpiCard label="Colaboradores no mês" format="integer" value={d?.totais.colaboradores} loading={q.isPending} />
        <KpiCard label="Já enviaram" format="integer" value={d?.totais.comNota} loading={q.isPending} description={d ? `${d.totais.aprovadas} aprovadas · ${d.totais.aguardandoRevisao} aguardando revisão · ${d.totais.reprovadas} reprovadas` : undefined} />
        <KpiCard label="Faltam enviar" format="integer" value={d?.totais.semNota} loading={q.isPending} polarity="down-is-good" />
        <KpiCard label="Soma das notas" value={d?.totais.valorNotasCentavos} loading={q.isPending} description="Valor informado nas notas do mês" />
      </KpiGrid>
      <DataTable
        caption={`Notas fiscais de ${mesLabel(mes)}`}
        columns={cols}
        data={d?.itens}
        rowKey={(i) => i.colaboradorId}
        loading={q.isPending}
        fetching={q.isFetching && !q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        dense
        empty={{ title: 'Nenhum colaborador neste mês.' }}
      />
    </div>
  );
}

export default function DocumentosPage() {
  const { rhCan, rhPapel } = usePermissions();
  const verTodos = rhPapel === 'RH' || rhPapel === 'CEO';
  const { sp, update } = useUrlSearchParams();
  // quem vê todos abre na visão do mês (quem enviou e quem falta); a lista completa fica na outra aba
  const aba = verTodos && sp.get('visao') !== 'lista' ? 'mes' : 'lista';
  return (
    <>
      <PageHeader
        title={verTodos ? 'Notas fiscais e comprovantes' : 'Minhas notas fiscais e comprovantes'}
        description={rhCan('documentos.revisar') ? 'Revise as notas enviadas e anexe os comprovantes de pagamento.' : verTodos ? 'Notas fiscais e comprovantes de todos os colaboradores.' : 'Envie a sua nota fiscal todo mês e acompanhe aqui o comprovante de pagamento.'}
        actions={
          verTodos ? (
            <Segmented
              label="Visão das notas"
              value={aba}
              onChange={(v) => update((prev) => { const n = new URLSearchParams(prev); n.set('visao', v); return n; })}
              options={[{ value: 'mes', label: 'Por mês' }, { value: 'lista', label: 'Lista completa' }]}
            />
          ) : undefined
        }
      />
      {aba === 'mes' ? <NotasDoMes /> : <DocumentosLista />}
    </>
  );
}
