import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LoaderCircle, Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ErrorState } from '@/components/feedback/ErrorState';
import { DateInput } from '@/components/forms/DateInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { retryPolicy } from '@/hooks/useReport';
import { formatDate } from '@/lib/dates';
import { PERIODICIDADE_LABEL } from '@/lib/formatters';
import { custosService } from '@/services/custos.service';
import { ApiError } from '@/types/api.types';
import type { Periodicidade } from '@/types/financial.types';
import { useCategorias } from './CostForm';

const catSchema = z.object({ nome: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(80) });
const recSchema = z.object({
  periodicidade: z.enum(['SEMANAL', 'MENSAL', 'TRIMESTRAL', 'ANUAL']),
  inicio: z.string().min(1, 'Informe o início'),
  fim: z.string().optional(),
}).refine((v) => !v.fim || v.fim >= v.inicio, { path: ['fim'], message: 'O fim deve ser posterior ao início' });

function msg(e: unknown, fallback: string): string {
  return e instanceof ApiError && (e.status === 409 || e.status === 422) ? e.message : fallback;
}

/**
 * "Editar tipos, recorrências e colunas": só o que o backend suporta de verdade —
 * criar/renomear/ativar tipos (categorias) e criar recorrências. Colunas fixas não são personalizáveis (sem persistência).
 */
export function CostManagementPanel() {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const canWrite = can('custos.write');
  const [open, setOpen] = useState(false);
  const categorias = useCategorias();
  const recorrencias = useQuery({ queryKey: ['custos', 'recorrencias'], enabled: open, retry: retryPolicy, queryFn: async ({ signal }) => (await custosService.recorrencias(signal)).data });
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');

  const catForm = useForm<z.infer<typeof catSchema>>({ resolver: zodResolver(catSchema), defaultValues: { nome: '' } });
  const addCat = useMutation({
    mutationFn: (nome: string) => custosService.criarCategoria(nome),
    onSuccess: () => { toast.success('Tipo criado.'); catForm.reset(); void qc.invalidateQueries({ queryKey: ['custos', 'categorias'] }); },
    onError: (e) => toast.error(msg(e, 'Não foi possível criar o tipo.')),
  });
  const updCat = useMutation({
    mutationFn: (v: { id: string; nome?: string; ativa?: boolean }) => custosService.atualizarCategoria(v.id, { nome: v.nome, ativa: v.ativa }),
    onSuccess: () => { toast.success('Tipo atualizado.'); setEditId(null); void qc.invalidateQueries({ queryKey: ['custos', 'categorias'] }); },
    onError: (e) => toast.error(msg(e, 'Não foi possível atualizar o tipo.')),
  });

  const recForm = useForm<z.infer<typeof recSchema>>({ resolver: zodResolver(recSchema), defaultValues: { periodicidade: 'MENSAL', inicio: '', fim: '' } });
  const addRec = useMutation({
    mutationFn: (v: z.infer<typeof recSchema>) => custosService.criarRecorrencia({ periodicidade: v.periodicidade as Periodicidade, inicio: v.inicio, fim: v.fim || undefined }),
    onSuccess: () => { toast.success('Recorrência criada.'); recForm.reset(); void qc.invalidateQueries({ queryKey: ['custos', 'recorrencias'] }); },
    onError: (e) => toast.error(msg(e, 'Não foi possível criar a recorrência.')),
  });

  return (
    <Card className="no-print">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="painel-gestao-custos"
        className="flex w-full items-center justify-between rounded-lg px-4 py-3.5 text-left text-[13px] font-medium"
      >
        Editar tipos e recorrências
        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id="painel-gestao-custos" className="grid grid-cols-1 gap-6 border-t border-border p-4 sm:p-5 lg:grid-cols-2">
          <section aria-label="Tipos de custo" className="space-y-3">
            <h3 className="text-[13px] font-semibold">Tipos de custo</h3>
            {categorias.error ? <ErrorState error={categorias.error} compact onRetry={() => void categorias.refetch()} /> : (
              <ul className="divide-y divide-border/60 text-[13px]">
                {(categorias.data ?? []).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                    {editId === c.id ? (
                      <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); updCat.mutate({ id: c.id, nome: editNome }); }}>
                        <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} aria-label="Novo nome do tipo" className="h-8" />
                        <Button size="sm" type="submit" disabled={updCat.isPending || editNome.trim().length < 2}>Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancelar</Button>
                      </form>
                    ) : (
                      <>
                        <span className="flex items-center gap-2">{c.nome} {!c.ativa && <Badge>inativo</Badge>}</span>
                        {canWrite && (
                          <span className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setEditId(c.id); setEditNome(c.nome); }}>Renomear</Button>
                            <Button size="sm" variant="ghost" disabled={updCat.isPending} onClick={() => updCat.mutate({ id: c.id, ativa: !c.ativa })}>{c.ativa ? 'Desativar' : 'Ativar'}</Button>
                          </span>
                        )}
                      </>
                    )}
                  </li>
                ))}
                {!categorias.isPending && (categorias.data?.length ?? 0) === 0 && <li className="py-3 text-xs text-muted-foreground">Nenhum tipo cadastrado ainda.</li>}
              </ul>
            )}
            {canWrite && (
              <form onSubmit={catForm.handleSubmit((v) => addCat.mutate(v.nome))} className="flex items-start gap-2" noValidate>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="novo-tipo" className="sr-only">Novo tipo</Label>
                  <Input id="novo-tipo" placeholder="Novo tipo de custo" aria-invalid={!!catForm.formState.errors.nome} {...catForm.register('nome')} />
                  {catForm.formState.errors.nome && <p role="alert" className="text-xs text-negative">{catForm.formState.errors.nome.message}</p>}
                </div>
                <Button type="submit" disabled={addCat.isPending}>{addCat.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />} Criar</Button>
              </form>
            )}
          </section>

          <section aria-label="Recorrências" className="space-y-3">
            <h3 className="text-[13px] font-semibold">Recorrências cadastradas</h3>
            {recorrencias.error ? <ErrorState error={recorrencias.error} compact onRetry={() => void recorrencias.refetch()} /> : (
              <ul className="divide-y divide-border/60 text-[13px]">
                {(recorrencias.data ?? []).map((r) => (
                  <li key={r.id} className="py-2">{PERIODICIDADE_LABEL[r.periodicidade]} · desde {formatDate(r.inicio)} {r.fim ? `até ${formatDate(r.fim)}` : '· sem data final'}</li>
                ))}
                {!recorrencias.isPending && (recorrencias.data?.length ?? 0) === 0 && <li className="py-3 text-xs text-muted-foreground">Nenhuma recorrência.</li>}
              </ul>
            )}
            {canWrite && (
              <form onSubmit={recForm.handleSubmit((v) => addRec.mutate(v))} className="space-y-2 border-t border-border pt-3" noValidate>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="rec-per">Periodicidade</Label>
                    <Controller control={recForm.control} name="periodicidade" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="rec-per"><SelectValue /></SelectTrigger>
                        <SelectContent>{(['SEMANAL', 'MENSAL', 'TRIMESTRAL', 'ANUAL'] as const).map((p) => <SelectItem key={p} value={p}>{PERIODICIDADE_LABEL[p]}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rec-ini">Início</Label>
                    <Controller control={recForm.control} name="inicio" render={({ field }) => <DateInput id="rec-ini" value={field.value} onChange={field.onChange} invalid={!!recForm.formState.errors.inicio} />} />
                    {recForm.formState.errors.inicio && <p role="alert" className="text-xs text-negative">{recForm.formState.errors.inicio.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rec-fim">Fim (opcional)</Label>
                    <Controller control={recForm.control} name="fim" render={({ field }) => <DateInput id="rec-fim" value={field.value ?? ''} onChange={field.onChange} invalid={!!recForm.formState.errors.fim} />} />
                    {recForm.formState.errors.fim && <p role="alert" className="text-xs text-negative">{recForm.formState.errors.fim.message}</p>}
                  </div>
                </div>
                <Button type="submit" disabled={addRec.isPending}>{addRec.isPending && <LoaderCircle className="animate-spin" />} Criar recorrência</Button>
                <p className="text-[11px] text-muted-foreground">A recorrência é processada pelo servidor (projeção das próximas ocorrências); o frontend não a simula. Para vinculá-la a um custo, escolha a periodicidade ao lançar o custo.</p>
              </form>
            )}
          </section>
        </div>
      )}
    </Card>
  );
}
