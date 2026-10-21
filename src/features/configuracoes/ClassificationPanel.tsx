import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ConfirmDialog } from '@/components/forms/ConfirmDialog';
import { PageGrid } from '@/components/layout/PageGrid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFilters } from '@/hooks/useFilters';
import { usePermissions } from '@/hooks/usePermissions';
import { retryPolicy } from '@/hooks/useReport';
import { formatInteger, grupoLabel } from '@/lib/formatters';
import { adminService, type NovaRegraClassificacao } from '@/services/admin.service';
import { ApiError } from '@/types/api.types';

const CAMPOS = ['ORIGEM', 'TIPO_ATENDIMENTO', 'LOJA', 'CAMPANHA', 'UTM_SOURCE', 'SRC', 'CHECKOUT'] as const;
const OPERADORES = [['IGUAL', 'é igual a'], ['CONTEM', 'contém'], ['COMECA_COM', 'começa com']] as const;
const GRUPOS = ['BACKEND_OUTROS', 'FRONT', 'CALL_CENTER', 'RECUPERACAO', 'AFILIADO', 'NAO_CLASSIFICADA'] as const;

const schema = z.object({
  nome: z.string().trim().min(2, 'Informe um nome').max(120),
  campo: z.enum(CAMPOS),
  operador: z.enum(['IGUAL', 'CONTEM', 'COMECA_COM']),
  valor: z.string().trim().min(1, 'Informe o valor a comparar').max(200),
  grupo: z.enum(GRUPOS),
  canal: z.string().trim().max(60).optional(),
  prioridade: z.coerce.number().int().min(1).max(10000),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

/** Regras explícitas e auditáveis (nada é inferido de nomes de produto). Escrita só para ADMIN; o backend reclassifica em segundo plano. */
export function ClassificationPanel() {
  const { can } = usePermissions();
  const { range } = useFilters();
  const qc = useQueryClient();
  const admin = can('classificacoes.admin');
  const [removing, setRemoving] = useState<string | null>(null);

  const regras = useQuery({ queryKey: ['classificacoes', 'regras'], retry: retryPolicy, queryFn: async ({ signal }) => (await adminService.regrasClassificacao(signal)).data });
  const pend = useQuery({ queryKey: ['classificacoes', 'pendencias', range], retry: retryPolicy, queryFn: async ({ signal }) => (await adminService.pendencias({ de: range.de, ate: range.ate }, signal)).data });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', campo: 'ORIGEM', operador: 'IGUAL', valor: '', grupo: 'BACKEND_OUTROS', canal: '', prioridade: 100 },
  });
  const criar = useMutation({
    mutationFn: (v: FormOut) => adminService.criarRegraClassificacao({ ...v, canal: v.canal || undefined, ativa: true } as NovaRegraClassificacao),
    onSuccess: () => { toast.success('Regra criada. As vendas serão reclassificadas em segundo plano.'); reset(); void qc.invalidateQueries({ queryKey: ['classificacoes'] }); },
    onError: (e) => toast.error(e instanceof ApiError && e.status === 422 ? e.message : 'Não foi possível criar a regra.'),
  });
  const remover = useMutation({
    mutationFn: (id: string) => adminService.removerRegraClassificacao(id),
    onSuccess: () => { toast.success('Regra removida.'); setRemoving(null); void qc.invalidateQueries({ queryKey: ['classificacoes'] }); },
    onError: () => toast.error('Não foi possível remover a regra.'),
  });

  return (
    <PageGrid cols={2}>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Regras de classificação de origem</CardTitle>
          <CardDescription>Única forma de uma venda ser Back-end Outros. Menor prioridade vence. Afiliado e Call Center têm precedência fixa sobre as regras.</CardDescription>
        </CardHeader>
        <CardContent>
          {regras.error ? <ErrorState error={regras.error} compact onRetry={() => void regras.refetch()} /> : (
            <Table label="Regras de classificação">
              <TableHeader><TableRow><TableHead>Prioridade</TableHead><TableHead>Nome</TableHead><TableHead>Condição</TableHead><TableHead>Grupo</TableHead><TableHead>Canal</TableHead><TableHead>Versão</TableHead>{admin && <TableHead className="text-right">Ações</TableHead>}</TableRow></TableHeader>
              <TableBody>
                {(regras.data ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.prioridade}</TableCell>
                    <TableCell className="font-medium">{r.nome} {!r.ativa && <Badge>inativa</Badge>}</TableCell>
                    <TableCell className="text-xs">{r.campo} {OPERADORES.find(([o]) => o === r.operador)?.[1]} "{r.valor}"</TableCell>
                    <TableCell>{grupoLabel(r.grupo)}</TableCell>
                    <TableCell>{r.canal ?? '—'}</TableCell>
                    <TableCell>v{r.versao}</TableCell>
                    {admin && <TableCell className="text-right"><Button variant="ghost" size="icon-sm" className="text-negative" aria-label={`Remover regra ${r.nome}`} onClick={() => setRemoving(r.id)}><Trash2 /></Button></TableCell>}
                  </TableRow>
                ))}
                {!regras.isPending && (regras.data?.length ?? 0) === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-xs text-muted-foreground">Nenhuma regra cadastrada: vendas fora de Front, Call Center e Afiliado ficam como "Não classificadas".</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {admin && (
        <Card>
          <CardHeader><CardTitle>Nova regra</CardTitle><CardDescription>Teste o impacto antes pela API de simulação; alterações são auditadas.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((v) => criar.mutate(v))} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2"><Label htmlFor="r-nome">Nome</Label><Input id="r-nome" aria-invalid={!!errors.nome} {...register('nome')} />{errors.nome && <p role="alert" className="text-xs text-negative">{errors.nome.message}</p>}</div>
              <div className="space-y-1"><Label htmlFor="r-campo">Campo</Label><Controller control={control} name="campo" render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="r-campo"><SelectValue /></SelectTrigger><SelectContent>{CAMPOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>} /></div>
              <div className="space-y-1"><Label htmlFor="r-op">Operador</Label><Controller control={control} name="operador" render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="r-op"><SelectValue /></SelectTrigger><SelectContent>{OPERADORES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>} /></div>
              <div className="space-y-1"><Label htmlFor="r-valor">Valor</Label><Input id="r-valor" aria-invalid={!!errors.valor} {...register('valor')} />{errors.valor && <p role="alert" className="text-xs text-negative">{errors.valor.message}</p>}</div>
              <div className="space-y-1"><Label htmlFor="r-grupo">Grupo</Label><Controller control={control} name="grupo" render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="r-grupo"><SelectValue /></SelectTrigger><SelectContent>{GRUPOS.map((g) => <SelectItem key={g} value={g}>{grupoLabel(g)}</SelectItem>)}</SelectContent></Select>} /></div>
              <div className="space-y-1"><Label htmlFor="r-canal">Canal (rótulo)</Label><Input id="r-canal" placeholder="SMS, E-mail..." {...register('canal')} /></div>
              <div className="space-y-1"><Label htmlFor="r-prio">Prioridade</Label><Input id="r-prio" type="number" min={1} aria-invalid={!!errors.prioridade} {...register('prioridade')} />{errors.prioridade && <p role="alert" className="text-xs text-negative">{errors.prioridade.message}</p>}</div>
              <div className="sm:col-span-2"><Button type="submit" disabled={criar.isPending}>{criar.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />} Criar regra</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className={admin ? '' : 'lg:col-span-2'}>
        <CardHeader><CardTitle>Pendências no período</CardTitle><CardDescription>Vendas que nenhum critério classificou, agrupadas pelos campos que podem sustentar uma regra</CardDescription></CardHeader>
        <CardContent>
          {pend.error ? <ErrorState error={pend.error} compact onRetry={() => void pend.refetch()} /> : !pend.data ? <p className="text-xs text-muted-foreground">Carregando…</p> : (
            <>
              <p className="mb-2 text-[13px]"><Badge variant={pend.data.totalPendentes > 0 ? 'warning' : 'positive'}>{formatInteger(pend.data.totalPendentes)}</Badge> vendas não classificadas</p>
              <ul className="divide-y divide-border/60 text-[13px]">
                {pend.data.agrupamentos.map((a, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>tipo: {a.tipoBruto ?? '—'} · origem: {a.origem ?? '—'} · atendimento: {a.tipoAtendimento ?? '—'}</span>
                    <span className="text-muted-foreground">{formatInteger(a.pedidos)} pedidos · <CurrencyValue centavos={a.valorVendaCentavos} /></span>
                  </li>
                ))}
              </ul>
              {pend.data.totalPendentes > 0 && <p className="mt-2 text-[11px] text-muted-foreground">{pend.data.orientacao}</p>}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)} title="Remover regra?" description="As vendas serão reclassificadas em segundo plano. A remoção fica registrada na auditoria." confirmLabel="Remover" destructive loading={remover.isPending} onConfirm={() => { if (removing) remover.mutate(removing); }} />
    </PageGrid>
  );
}
