import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Lock, LoaderCircle, Pencil, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid } from '@/components/cards/KpiGrid';
import { ConfirmDialog } from '@/components/forms/ConfirmDialog';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Notice } from '@/components/feedback/Notice';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/hooks/usePermissions';
import { retryPolicy } from '@/hooks/useReport';
import { rhService } from '@/services/rh.service';
import { ApiError } from '@/types/api.types';
import type { RhFolhaItem } from '@/types/rh.types';
import { dia, mesLabel } from './rh-format';

function EditarItem({ item, competencia, fechada, onClose }: { item: RhFolhaItem | null; competencia: string; fechada: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [comissao, setComissao] = useState<number | null>(null);
  const [bonus, setBonus] = useState<number | null>(null);
  const [desconto, setDesconto] = useState<number | null>(null);
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  // preenche com os valores do item quando o diálogo abre para outra pessoa
  if (item && aberto !== item.id) {
    setAberto(item.id);
    setComissao(item.comissaoCentavos);
    setBonus(item.bonusCentavos);
    setDesconto(item.descontoCentavos);
    setObs(item.obs ?? '');
    setErro(null);
  }

  const salvar = useMutation({
    mutationFn: () => rhService.editarItem(competencia, item!.id, { comissaoCentavos: comissao ?? 0, bonusCentavos: bonus ?? 0, descontoCentavos: desconto ?? 0, obs: obs.trim() || null }),
    onSuccess: () => {
      toast.success('Lançamentos salvos.');
      void qc.invalidateQueries({ queryKey: ['rh', 'folha', competencia] });
      void qc.invalidateQueries({ queryKey: ['rh', 'folhas'] });
      setAberto(null);
      onClose();
    },
    onError: (e) => setErro(e instanceof ApiError && [409, 422].includes(e.status ?? 0) ? e.message : 'Não foi possível salvar.'),
  });

  const total = item ? item.salarioCentavos + (comissao ?? 0) + (bonus ?? 0) - (desconto ?? 0) : 0;

  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) { setAberto(null); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item?.colaborador.nome}</DialogTitle>
          <DialogDescription>
            Salário do mês: <CurrencyValue centavos={item?.salarioCentavos} /> ({item?.diasTrabalhados} de 30 dias). Comissão, bônus e desconto são lançados à mão.
          </DialogDescription>
        </DialogHeader>
        {fechada && <Notice tone="warning">Folha fechada: só o pagamento pode ser registrado.</Notice>}
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setErro(null); salvar.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1"><Label htmlFor="i-com">Comissão</Label><MoneyInput id="i-com" value={comissao} onValueChange={setComissao} disabled={fechada} /></div>
            <div className="space-y-1"><Label htmlFor="i-bon">Bônus</Label><MoneyInput id="i-bon" value={bonus} onValueChange={setBonus} disabled={fechada} /></div>
            <div className="space-y-1"><Label htmlFor="i-des">Desconto</Label><MoneyInput id="i-des" value={desconto} onValueChange={setDesconto} disabled={fechada} /></div>
          </div>
          <div className="space-y-1"><Label htmlFor="i-obs">Observação</Label><Input id="i-obs" value={obs} maxLength={500} onChange={(e) => setObs(e.target.value)} /></div>
          <p className="text-sm">Total a pagar: <strong className="text-primary"><CurrencyValue centavos={total} /></strong></p>
          {erro && <p role="alert" className="text-sm text-negative">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setAberto(null); onClose(); }}>Cancelar</Button>
            <Button type="submit" disabled={fechada || salvar.isPending}>{salvar.isPending && <LoaderCircle className="animate-spin" />} Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Folha de um mês: totais, uma linha por pessoa e, para o RH, os lançamentos, o pagamento e o fechamento. */
export default function FolhaDetalhePage() {
  const { competencia } = useParams<{ competencia: string }>();
  const qc = useQueryClient();
  const { rhCan } = usePermissions();
  const editar = rhCan('folha.editar');
  const [item, setItem] = useState<RhFolhaItem | null>(null);
  const [fechar, setFechar] = useState(false);
  const valida = !!competencia && /^\d{4}-\d{2}$/.test(competencia);

  const q = useQuery({
    queryKey: ['rh', 'folha', competencia],
    enabled: valida,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && retryPolicy(n, e),
    queryFn: async ({ signal }) => (await rhService.folha(competencia!, signal)).data,
  });

  const invalida = () => {
    void qc.invalidateQueries({ queryKey: ['rh', 'folha', competencia] });
    void qc.invalidateQueries({ queryKey: ['rh', 'folhas'] });
  };
  const gerar = useMutation({
    mutationFn: (recalcular: boolean) => rhService.gerarFolha(competencia!, recalcular),
    onSuccess: (r) => {
      toast.success(r.data.incluidos || r.data.recalculados ? `Folha atualizada: ${r.data.incluidos} incluídos, ${r.data.recalculados} recalculados.` : 'A folha já estava em dia.');
      invalida();
    },
    onError: (e) => toast.error(e instanceof ApiError && e.status === 409 ? e.message : 'Não foi possível atualizar a folha.'),
  });
  const pagar = useMutation({
    mutationFn: (i: RhFolhaItem) => rhService.editarItem(competencia!, i.id, i.status === 'PAGO' ? { status: 'PENDENTE' } : { status: 'PAGO' }),
    onSuccess: invalida,
    onError: () => toast.error('Não foi possível registrar o pagamento.'),
  });
  const fecharFolha = useMutation({
    mutationFn: () => rhService.fecharFolha(competencia!),
    onSuccess: () => {
      toast.success('Folha fechada.');
      setFechar(false);
      invalida();
    },
    onError: (e) => toast.error(e instanceof ApiError && e.status === 409 ? e.message : 'Não foi possível fechar a folha.'),
  });

  if (!valida) return <Navigate to="/rh/folha" replace />;
  const naoGerada = q.error instanceof ApiError && q.error.status === 404;
  const f = q.data;
  const fechada = f?.status === 'FECHADA';

  const cols: Column<RhFolhaItem>[] = [
    { id: 'nome', header: 'Colaborador', mobile: 'title', cell: (i) => <Link to={`/rh/colaboradores/${i.colaborador.id}`} className="font-medium hover:text-primary hover:underline">{i.colaborador.nome}</Link> },
    { id: 'depto', header: 'Departamento', mobile: 'hidden', cell: (i) => i.colaborador.departamento },
    { id: 'mensal', header: 'Salário mensal', align: 'right', mobile: 'hidden', cell: (i) => <CurrencyValue centavos={i.salarioMensalCentavos} /> },
    { id: 'dias', header: 'Dias', align: 'right', cell: (i) => (i.diasTrabalhados < 30 ? <Badge variant="warning" title="Proporcional: entrou ou saiu no mês">{i.diasTrabalhados}/30</Badge> : '30') },
    { id: 'salario', header: 'Salário do mês', align: 'right', cell: (i) => <CurrencyValue centavos={i.salarioCentavos} /> },
    { id: 'com', header: 'Comissão', align: 'right', cell: (i) => <CurrencyValue centavos={i.comissaoCentavos} /> },
    { id: 'bon', header: 'Bônus', align: 'right', cell: (i) => <CurrencyValue centavos={i.bonusCentavos} /> },
    { id: 'des', header: 'Desconto', align: 'right', cell: (i) => <CurrencyValue centavos={i.descontoCentavos} /> },
    { id: 'total', header: 'Total', align: 'right', mobile: 'value', cell: (i) => <strong className="font-semibold"><CurrencyValue centavos={i.totalCentavos} /></strong> },
    { id: 'status', header: 'Pagamento', cell: (i) => (i.status === 'PAGO' ? <Badge variant="positive" title={i.pagoEm ? `Pago em ${dia(i.pagoEm)}` : undefined}>Pago</Badge> : <Badge variant="warning">Pendente</Badge>) },
    ...(editar
      ? [{
          id: 'acoes', header: 'Ações', align: 'right' as const, mobile: 'actions' as const,
          cell: (i: RhFolhaItem) => (
            <span className="flex flex-wrap justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => setItem(i)}><Pencil /> Lançar</Button>
              <Button variant="ghost" size="sm" disabled={pagar.isPending} onClick={() => pagar.mutate(i)}>{i.status === 'PAGO' ? 'Desfazer pago' : 'Marcar pago'}</Button>
            </span>
          ),
        }]
      : []),
  ];

  return (
    <>
      <Link to="/rh/folha" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Voltar às folhas</Link>
      <PageHeader
        title={`Folha de ${mesLabel(competencia)}`}
        description={fechada ? `Fechada${f?.fechadaEm ? ` em ${dia(f.fechadaEm)}` : ''}. Só o pagamento pode ser registrado.` : 'Aberta: acompanha mudanças de salário vindas do sistema de RH.'}
        actions={
          editar && f ? (
            <>
              {!fechada && <Button variant="secondary" disabled={gerar.isPending} onClick={() => gerar.mutate(true)}><RefreshCw className={gerar.isPending ? 'animate-spin' : undefined} /> Atualizar folha</Button>}
              {!fechada && <Button onClick={() => setFechar(true)}><Lock /> Fechar folha</Button>}
            </>
          ) : undefined
        }
      />

      {naoGerada ? (
        <EmptyState
          title="Esta folha ainda não foi gerada."
          description={editar ? 'Gere a folha para incluir quem estava ativo no mês.' : 'O RH ainda não gerou a folha deste mês.'}
          action={editar ? <Button disabled={gerar.isPending} onClick={() => gerar.mutate(false)}>{gerar.isPending && <LoaderCircle className="animate-spin" />} Gerar folha de {mesLabel(competencia)}</Button> : undefined}
        />
      ) : q.isError && !f ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <KpiGrid cols={4}>
            <KpiCard label="Total da folha" hero highlight value={f?.resumo.totalCentavos} loading={q.isPending} description="Salários + comissões + bônus − descontos" />
            <KpiCard label="Salários do mês" value={f?.resumo.salariosCentavos} loading={q.isPending} description={f && f.resumo.salariosMensaisCentavos !== f.resumo.salariosCentavos ? 'Já com o proporcional de quem entrou ou saiu' : undefined} />
            <KpiCard label="Pago" value={f?.resumo.pagoCentavos} loading={q.isPending} valueTone="positive" />
            <KpiCard label="A pagar" value={f?.resumo.pendenteCentavos} loading={q.isPending} />
          </KpiGrid>
          <DataTable caption="Itens da folha" columns={cols} data={f?.itens} rowKey={(i) => i.id} loading={q.isPending} dense empty={{ title: 'Folha sem itens.' }} />
        </>
      )}

      <EditarItem item={item} competencia={competencia} fechada={fechada} onClose={() => setItem(null)} />
      <ConfirmDialog
        open={fechar}
        onOpenChange={setFechar}
        title={`Fechar a folha de ${mesLabel(competencia)}?`}
        description="Depois de fechada, salários, comissões, bônus e descontos não podem mais ser alterados (só o registro de pagamento)."
        confirmLabel="Fechar folha"
        loading={fecharFolha.isPending}
        onConfirm={() => fecharFolha.mutate()}
      />
    </>
  );
}
