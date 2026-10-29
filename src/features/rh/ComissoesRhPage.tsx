import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid } from '@/components/cards/KpiGrid';
import { Notice } from '@/components/feedback/Notice';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { retryPolicy } from '@/hooks/useReport';
import { useUrlSearchParams } from '@/hooks/useUrlSearchParams';
import { rhService } from '@/services/rh.service';
import { ApiError } from '@/types/api.types';
import type { RhComissaoItem } from '@/types/rh.types';
import { mesAtual, mesLabel } from './rh-format';

/**
 * Comissão do time do Front por pessoa: criativos e VSL (5% do MC BR; Elias 7,5%), otimizações validadas (R$ 500), liderança do Elias,
 * editor, gestor e o fixo do Iago. O MC BR dos criativos vem do sistema de copy; o das VSLs, do RedTrack por landing. O que ainda não bate
 * com a folha aparece "em implementação" e fica fora do total. A lista traz só quem tem valor a pagar. O RH vincula cada pessoa ao colaborador, lança as otimizações, cadastra as VSLs
 * sem dono e lança o valor na folha quando o mês fecha no copy. A área é só do RH e do CEO (o CEO só lê).
 */
export default function ComissoesRhPage() {
  const qc = useQueryClient();
  const { rhCan } = usePermissions();
  const ehRh = rhCan('comissoes.lancar');
  const { sp, update } = useUrlSearchParams();
  const mes = sp.get('mes') ?? mesAtual();
  const [otimAberta, setOtimAberta] = useState(false);
  const [vslAberta, setVslAberta] = useState(false);

  const q = useQuery({
    queryKey: ['rh', 'comissoes', mes],
    retry: retryPolicy,
    queryFn: async ({ signal }) => (await rhService.comissoes(mes, signal)).data,
  });
  const pessoas = useQuery({
    queryKey: ['rh', 'colaboradores-vinculo'],
    enabled: ehRh,
    staleTime: 5 * 60_000,
    retry: retryPolicy,
    queryFn: async ({ signal }) => (await rhService.colaboradores({ limit: 100 }, signal)).data,
  });
  const vincular = useMutation({
    mutationFn: (v: { chave: string; colaboradorId: string | null }) => rhService.vincularComissao(v.chave, v.colaboradorId),
    onSuccess: () => {
      toast.success('Vínculo salvo.');
      void qc.invalidateQueries({ queryKey: ['rh', 'comissoes'] });
    },
    onError: () => toast.error('Não foi possível salvar o vínculo.'),
  });
  const lancar = useMutation({
    mutationFn: () => rhService.lancarComissoes(mes),
    onSuccess: ({ data }) => {
      toast.success(data.alterados === 0 ? 'A folha já estava com esses valores.' : `Comissão lançada na folha de ${mesLabel(mes)} (${data.alterados} alterados).`);
      void qc.invalidateQueries({ queryKey: ['rh'] });
    },
    onError: (e) => toast.error(e instanceof ApiError && e.status === 409 ? e.message : 'Não foi possível lançar na folha.'),
  });

  const d = q.data;
  const ok = d?.disponivel === true ? d : null;
  const sugestoes = ok?.sugestoes ?? {};
  const todosColabs = pessoas.data ?? [];
  const semDono = ok?.vsl?.semDono ?? [];
  const nomesCopy = (ok?.itens ?? []).filter((i) => i.tipo === 'COPYWRITER').map((i) => i.nome);

  const motivoSemLancar = !ok
    ? null
    : ok.estado !== 'FECHADO'
      ? 'O mês ainda não fechou no sistema de copy: o valor é provisório e só vai para a folha depois do fechamento.'
      : ok.vsl && !ok.vsl.disponivel
        ? 'Não foi possível ler as VSLs no RedTrack agora: tente de novo para não lançar um valor incompleto.'
        : semDono.length > 0
          ? 'Cadastre o dono das VSLs novas para poder lançar.'
          : !ok.folha
            ? `Gere a folha de ${mesLabel(mes)} antes de lançar.`
            : ok.folha.status === 'FECHADA'
              ? 'A folha deste mês está fechada.'
              : ok.totais && ok.totais.semVinculo > 0
                ? 'Vincule todas as pessoas com valor a pagar a um colaborador para poder lançar.'
                : null;

  const traco = <span className="text-muted-foreground">—</span>;
  const valor = (i: RhComissaoItem, c: number | null) => (i.status === 'EM_IMPLEMENTACAO' || c === null ? traco : <CurrencyValue centavos={c} />);

  const cols: Column<RhComissaoItem>[] = [
    {
      id: 'pessoa',
      header: 'Pessoa',
      mobile: 'title',
      sortable: true,
      sortValue: (i) => i.nome,
      cell: (i) => (
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">{i.nome}</span>
            {i.status === 'EM_IMPLEMENTACAO' && <Badge variant="warning">Em implementação</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">{i.motivo ?? i.regra}</div>
        </div>
      ),
    },
    {
      id: 'colab',
      header: 'Colaborador',
      cell: (i) => {
        if (!ehRh || i.status === 'EM_IMPLEMENTACAO') return i.colaborador?.nome ?? '—';
        const sug = sugestoes[i.chave] ?? [];
        const resto = todosColabs.filter((c) => !sug.some((s) => s.id === c.id));
        return (
          <Select value={i.colaborador?.id ?? ''} onValueChange={(v) => vincular.mutate({ chave: i.chave, colaboradorId: v })} disabled={vincular.isPending}>
            <SelectTrigger className="h-8 w-52" aria-label={`Colaborador de ${i.nome}`}>
              <SelectValue placeholder="Escolher colaborador" />
            </SelectTrigger>
            <SelectContent>
              {i.colaborador && !todosColabs.some((c) => c.id === i.colaborador!.id) && <SelectItem value={i.colaborador.id}>{i.colaborador.nome}</SelectItem>}
              {sug.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} (sugerido)</SelectItem>)}
              {resto.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      },
    },
    { id: 'criativos', header: 'Criativos', align: 'right', sortable: true, sortValue: (i) => i.criativosCentavos ?? 0, cell: (i) => valor(i, i.criativosCentavos) },
    { id: 'vsl', header: 'VSL', align: 'right', sortable: true, sortValue: (i) => i.vslCentavos ?? 0, cell: (i) => valor(i, i.vslCentavos) },
    { id: 'otim', header: 'Otimizações', align: 'right', cell: (i) => valor(i, i.otimizacoesCentavos) },
    {
      id: 'outros',
      header: 'Outros',
      align: 'right',
      cell: (i) =>
        i.outrosCentavos === null || i.status === 'EM_IMPLEMENTACAO' ? (
          traco
        ) : (
          <div className="space-y-0.5 text-right">
            <CurrencyValue centavos={i.outrosCentavos} />
            {i.outrosRotulo && <div className="text-xs text-muted-foreground">{i.outrosRotulo}</div>}
          </div>
        ),
    },
    {
      id: 'pagar',
      header: 'A pagar',
      align: 'right',
      mobile: 'value',
      sortable: true,
      sortValue: (i) => i.aPagarCentavos ?? -1,
      cell: (i) => (i.status === 'EM_IMPLEMENTACAO' ? traco : <span className="font-semibold"><CurrencyValue centavos={i.aPagarCentavos ?? 0} /></span>),
    },
    {
      id: 'folha',
      header: 'Na folha',
      align: 'right',
      cell: (i) =>
        i.status === 'EM_IMPLEMENTACAO' || i.naFolhaCentavos === null ? (
          traco
        ) : i.naFolhaCentavos === (i.aPagarCentavos ?? 0) ? (
          <Badge variant="positive">Lançada</Badge>
        ) : (
          <span className="flex items-center justify-end gap-2"><CurrencyValue centavos={i.naFolhaCentavos} /><Badge variant="warning">Diferente</Badge></span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Comissões por colaborador"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              aria-label="Mês de referência"
              value={mes}
              onChange={(e) => update((prev) => { const n = new URLSearchParams(prev); n.set('mes', e.target.value || mesAtual()); return n; })}
              className="h-9 w-full sm:w-44"
            />
            {ehRh && ok?.completa && <Button variant="outline" onClick={() => setOtimAberta(true)}>Otimizações</Button>}
            {ehRh && (
              <Button disabled={!ok || !!motivoSemLancar || lancar.isPending} onClick={() => lancar.mutate()}>
                Lançar na folha
              </Button>
            )}
          </div>
        }
      />
      <div className="space-y-4">
        {d && !d.disponivel && <Notice tone="info">{d.mensagem}</Notice>}
        {ok?.estado === 'PROVISORIO' && <Notice tone="warning">Mês em aberto no sistema de copy: os valores são provisórios e mudam até o fechamento.</Notice>}
        {ok && !ok.completa && <Notice tone="info">Antes de setembro/2026 vale só o 5% do MC BR dos criativos: VSL, otimizações e as demais regras começam em setembro.</Notice>}
        {ok?.vsl && !ok.vsl.disponivel && <Notice tone="warning">Não foi possível ler as VSLs no RedTrack ({ok.vsl.mensagem ?? 'sem resposta'}). Os valores de VSL, liderança, editor, gestor e fixo não aparecem até o RedTrack voltar.</Notice>}
        {semDono.length > 0 && (
          <Notice tone="warning">
            {semDono.length === 1 ? '1 VSL sem dono' : `${semDono.length} VSLs sem dono`} no RedTrack neste mês: o MC BR dela não entra na comissão de ninguém e o lançamento fica bloqueado.{' '}
            {ehRh && <button type="button" className="font-medium underline" onClick={() => setVslAberta(true)}>Cadastrar dono</button>}
          </Notice>
        )}
        {ehRh && ok && motivoSemLancar && ok.estado === 'FECHADO' && <Notice tone="info">{motivoSemLancar}</Notice>}
        {ok && ok.totais && (
          <KpiGrid cols={3}>
            <KpiCard label="A pagar no mês" value={ok.totais.aPagarCentavos} loading={q.isPending} description="Só entra quem tem valor a pagar: negativo e desligado ficam fora" />
            <KpiCard label="Sem colaborador vinculado" format="integer" value={ok.totais.semVinculo} loading={q.isPending} polarity="down-is-good" />
            <KpiCard label="Em implementação" format="integer" value={ok.totais.emImplementacao} loading={q.isPending} description="Não batem com a folha: ficam fora do total" />
          </KpiGrid>
        )}
        {(!d || d.disponivel) && (
          <DataTable
            caption={`Comissão do Front em ${mesLabel(mes)}`}
            columns={cols}
            data={ok?.itens}
            rowKey={(i) => i.chave}
            loading={q.isPending}
            fetching={q.isFetching && !q.isPending}
            error={q.error}
            onRetry={() => void q.refetch()}
            dense
            empty={{ title: 'Nenhuma comissão neste mês.' }}
          />
        )}
      </div>
      {ehRh && <OtimizacoesDialog open={otimAberta} onOpenChange={setOtimAberta} mes={mes} copywriters={nomesCopy} />}
      {ehRh && <VslDialog open={vslAberta} onOpenChange={setVslAberta} semDono={semDono} donos={[...nomesCopy, 'EMPRESA']} />}
    </>
  );
}

function OtimizacoesDialog({ open, onOpenChange, mes, copywriters }: { open: boolean; onOpenChange: (o: boolean) => void; mes: string; copywriters: string[] }) {
  const qc = useQueryClient();
  const [copy, setCopy] = useState('');
  const [descricao, setDescricao] = useState('');
  const lista = useQuery({
    queryKey: ['rh', 'comissoes', 'otimizacoes', mes],
    enabled: open,
    retry: retryPolicy,
    queryFn: async ({ signal }) => (await rhService.otimizacoes(mes, signal)).data,
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['rh', 'comissoes'] });
  const criar = useMutation({
    mutationFn: () => rhService.criarOtimizacao({ competencia: mes, copywriter: copy, descricao: descricao.trim() }),
    onSuccess: () => {
      setDescricao('');
      toast.success('Otimização lançada (R$ 500).');
      refresh();
    },
    onError: () => toast.error('Não foi possível lançar a otimização.'),
  });
  const remover = useMutation({
    mutationFn: (id: string) => rhService.removerOtimizacao(id),
    onSuccess: () => {
      toast.success('Otimização removida.');
      refresh();
    },
    onError: () => toast.error('Não foi possível remover a otimização.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Otimizações validadas de {mesLabel(mes)}</DialogTitle>
          <DialogDescription>Cada lead ou MLD validado vale R$ 500 para o copywriter, somado à comissão dele no mês.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <Select value={copy} onValueChange={setCopy}>
              <SelectTrigger className="h-9 w-44" aria-label="Copywriter"><SelectValue placeholder="Copywriter" /></SelectTrigger>
              <SelectContent>{copywriters.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="h-9 min-w-48 flex-1" placeholder="Qual (ex.: Nerve Pure LD12)" value={descricao} maxLength={200} onChange={(e) => setDescricao(e.target.value)} aria-label="Descrição da otimização" />
            <Button disabled={!copy || descricao.trim().length < 3 || criar.isPending} onClick={() => criar.mutate()}><Plus className="size-4" aria-hidden /> Lançar</Button>
          </div>
          <ul className="divide-y rounded-md border text-sm">
            {(lista.data ?? []).length === 0 && <li className="p-3 text-muted-foreground">Nenhuma otimização lançada neste mês.</li>}
            {(lista.data ?? []).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 p-3">
                <span><span className="font-medium">{o.copywriter}</span> · {o.descricao}</span>
                <span className="flex items-center gap-2">
                  <CurrencyValue centavos={o.valorCentavos} />
                  <Button variant="ghost" size="icon" aria-label={`Remover otimização de ${o.copywriter}`} disabled={remover.isPending} onClick={() => remover.mutate(o.id)}><Trash2 className="size-4" aria-hidden /></Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VslDialog({ open, onOpenChange, semDono, donos }: { open: boolean; onOpenChange: (o: boolean) => void; semDono: { vsl: string; mcBrCentavos: number }[]; donos: string[] }) {
  const qc = useQueryClient();
  const [dono, setDono] = useState<Record<string, string>>({});
  const [editor, setEditor] = useState<Record<string, string>>({});
  const salvar = useMutation({
    mutationFn: (vsl: string) => rhService.salvarVsl({ chave: vsl, dono: dono[vsl] ?? null, editor: editor[vsl]?.trim() || null, mesmaVsl: null }),
    onSuccess: () => {
      toast.success('VSL cadastrada.');
      void qc.invalidateQueries({ queryKey: ['rh', 'comissoes'] });
    },
    onError: () => toast.error('Não foi possível cadastrar a VSL.'),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>VSLs sem dono</DialogTitle>
          <DialogDescription>Escolha o copywriter dono de cada VSL (quem fez ou ripou) e, se houver, o editor da 1ª versão. Ripagem e página de oferta não têm editor.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-md border text-sm">
          {semDono.length === 0 && <li className="p-3 text-muted-foreground">Todas as VSLs deste mês têm dono.</li>}
          {semDono.map((v) => (
            <li key={v.vsl} className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-2"><span className="font-medium">{v.vsl}</span><CurrencyValue centavos={v.mcBrCentavos} /></div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={dono[v.vsl] ?? ''} onValueChange={(x) => setDono((p) => ({ ...p, [v.vsl]: x }))}>
                  <SelectTrigger className="h-8 w-44" aria-label={`Dono de ${v.vsl}`}><SelectValue placeholder="Dono da VSL" /></SelectTrigger>
                  <SelectContent>{donos.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="h-8 w-44" placeholder="Editor (opcional)" value={editor[v.vsl] ?? ''} maxLength={40} onChange={(e) => setEditor((p) => ({ ...p, [v.vsl]: e.target.value }))} aria-label={`Editor de ${v.vsl}`} />
                <Button size="sm" disabled={!dono[v.vsl] || salvar.isPending} onClick={() => salvar.mutate(v.vsl)}>Salvar</Button>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
