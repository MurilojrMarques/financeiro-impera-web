import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid } from '@/components/cards/KpiGrid';
import { Notice } from '@/components/feedback/Notice';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
 * Comissão do Front por colaborador (5% do MC BR de cada pessoa, lida do sistema de copy). Só o Front: Call Center e Recuperação são por
 * equipe. O RH vincula cada copywriter ao colaborador e lança o valor na folha quando o mês fecha no copy; os demais veem só o que é seu.
 */
export default function ComissoesRhPage() {
  const qc = useQueryClient();
  const { rhCan, rhPapel } = usePermissions();
  const ehRh = rhCan('comissoes.lancar');
  const verTodos = rhPapel === 'RH' || rhPapel === 'CEO';
  const { sp, update } = useUrlSearchParams();
  const mes = sp.get('mes') ?? mesAtual();

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
    mutationFn: (v: { copywriterId: string; colaboradorId: string | null }) => rhService.vincularComissao(v.copywriterId, v.colaboradorId),
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

  const motivoSemLancar = !ok
    ? null
    : ok.estado !== 'FECHADO'
      ? 'O mês ainda não fechou no sistema de copy: o valor é provisório e só vai para a folha depois do fechamento.'
      : !ok.folha
        ? `Gere a folha de ${mesLabel(mes)} antes de lançar.`
        : ok.folha.status === 'FECHADA'
          ? 'A folha deste mês está fechada.'
          : ok.totais && ok.totais.semVinculo > 0
            ? 'Vincule todos os copywriters a um colaborador para poder lançar.'
            : null;

  const cols: Column<RhComissaoItem>[] = [
    { id: 'copy', header: 'Copywriter (sistema de copy)', mobile: 'title', sortable: true, sortValue: (i) => i.copywriterNome, cell: (i) => <span className="font-medium">{i.copywriterNome}</span> },
    {
      id: 'colab',
      header: 'Colaborador',
      cell: (i) => {
        if (!ehRh) return i.colaborador?.nome ?? '—';
        const sug = sugestoes[i.copywriterId] ?? [];
        const resto = todosColabs.filter((c) => !sug.some((s) => s.id === c.id));
        return (
          <Select value={i.colaborador?.id ?? ''} onValueChange={(v) => vincular.mutate({ copywriterId: i.copywriterId, colaboradorId: v })} disabled={vincular.isPending}>
            <SelectTrigger className="h-8 w-56" aria-label={`Colaborador de ${i.copywriterNome}`}>
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
    { id: 'mc', header: 'MC BR', align: 'right', sortable: true, sortValue: (i) => i.mcBrCentavos, cell: (i) => <CurrencyValue centavos={i.mcBrCentavos} /> },
    { id: 'apurada', header: 'Comissão apurada (5%)', align: 'right', sortable: true, sortValue: (i) => i.comissaoCentavos, cell: (i) => <CurrencyValue centavos={i.comissaoCentavos} /> },
    { id: 'pagar', header: 'A pagar', align: 'right', mobile: 'value', sortable: true, sortValue: (i) => i.aPagarCentavos, cell: (i) => <span className="font-semibold"><CurrencyValue centavos={i.aPagarCentavos} /></span> },
    {
      id: 'folha',
      header: 'Na folha',
      align: 'right',
      cell: (i) =>
        i.naFolhaCentavos === null ? (
          <span className="text-muted-foreground">—</span>
        ) : i.naFolhaCentavos === i.aPagarCentavos ? (
          <Badge variant="positive">Lançada</Badge>
        ) : (
          <span className="flex items-center justify-end gap-2"><CurrencyValue centavos={i.naFolhaCentavos} /><Badge variant="warning">Diferente</Badge></span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={verTodos ? 'Comissões por colaborador' : 'Minhas comissões'}
        description="Comissão do Front: 5% do MC BR de cada pessoa, calculada no sistema de copy. Call Center e Recuperação são por equipe e não entram aqui."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              aria-label="Mês de referência"
              value={mes}
              onChange={(e) => update((prev) => { const n = new URLSearchParams(prev); n.set('mes', e.target.value || mesAtual()); return n; })}
              className="h-9 w-full sm:w-44"
            />
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
        {ehRh && ok && motivoSemLancar && ok.estado === 'FECHADO' && <Notice tone="info">{motivoSemLancar}</Notice>}
        {ok && ok.totais && (
          <KpiGrid cols={3}>
            <KpiCard label="A pagar no mês" value={ok.totais.aPagarCentavos} loading={q.isPending} description="Quem fecha negativo recebe zero" />
            <KpiCard label="Comissão apurada" value={ok.totais.comissaoCentavos} loading={q.isPending} description="Soma os negativos (como no sistema de copy)" />
            <KpiCard label="Sem colaborador vinculado" format="integer" value={ok.totais.semVinculo} loading={q.isPending} polarity="down-is-good" />
          </KpiGrid>
        )}
        {(!d || d.disponivel) && (
          <DataTable
            caption={`Comissão do Front em ${mesLabel(mes)}`}
            columns={cols}
            data={ok?.itens}
            rowKey={(i) => i.copywriterId}
            loading={q.isPending}
            fetching={q.isFetching && !q.isPending}
            error={q.error}
            onRetry={() => void q.refetch()}
            dense
            empty={{ title: verTodos ? 'Nenhuma comissão neste mês.' : 'Você não tem comissão neste mês.' }}
          />
        )}
      </div>
    </>
  );
}
