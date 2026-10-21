import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/forms/ConfirmDialog';
import { PageGrid } from '@/components/layout/PageGrid';
import { DateInput } from '@/components/forms/DateInput';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/lib/currency';
import { formatDate, formatDateTime } from '@/lib/dates';
import { afiliadosService } from '@/services/afiliados.service';
import { adminService } from '@/services/admin.service';
import { ApiError } from '@/types/api.types';
import { ErrorState } from '@/components/feedback/ErrorState';
import { retryPolicy } from '@/hooks/useReport';

const aliasSchema = z.object({ alias: z.string().trim().min(2, 'Informe ao menos 2 caracteres').max(120) });

const regraSchema = z
  .object({
    modo: z.enum(['FIXO', 'PERCENTUAL']),
    valorCentavos: z.number().int().positive().nullable(),
    percentual: z.string(),
    vigenteDe: z.string().min(1, 'Informe o início da vigência'),
    fonte: z.string().trim().min(3, 'Informe a fonte da regra (contrato, planilha...)').max(200),
    observacao: z.string().trim().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.modo === 'FIXO' && !v.valorCentavos) ctx.addIssue({ code: 'custom', path: ['valorCentavos'], message: 'Informe o valor' });
    if (v.modo === 'PERCENTUAL') {
      const n = Number(v.percentual.replace(',', '.'));
      if (!v.percentual || !Number.isFinite(n) || n <= 0 || n > 100) ctx.addIssue({ code: 'custom', path: ['percentual'], message: 'Percentual entre 0,01 e 100' });
    }
  });
type RegraForm = z.infer<typeof regraSchema>;

function errorText(e: unknown, fallback: string): string {
  return e instanceof ApiError && (e.status === 409 || e.status === 422) ? e.message : fallback;
}

/** Aliases, regras de comissão e histórico de alterações do afiliado. Escrita só para ADMIN; o backend revalida. */
export function AfiliadoAdminPanel({ afiliadoId, nome }: { afiliadoId: string; nome: string }) {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const admin = can('afiliados.admin');
  const verRegras = can('afiliados.ver-regras');
  const [aliasToRemove, setAliasToRemove] = useState<string | null>(null);

  const aliases = useQuery({ queryKey: ['afiliados', afiliadoId, 'aliases'], queryFn: async ({ signal }) => (await afiliadosService.aliases(afiliadoId, signal)).data, retry: retryPolicy });
  const regras = useQuery({ queryKey: ['afiliados', afiliadoId, 'regras'], queryFn: async ({ signal }) => (await afiliadosService.regrasComissao(afiliadoId, signal)).data, enabled: verRegras, retry: retryPolicy });
  const historico = useQuery({
    queryKey: ['afiliados', afiliadoId, 'historico'],
    enabled: admin,
    retry: retryPolicy,
    queryFn: async ({ signal }) => (await adminService.auditoria({ acao: 'afiliado.', limit: 100 }, signal)).data.filter((a) => a.entidadeId === afiliadoId),
  });

  const aliasForm = useForm<z.infer<typeof aliasSchema>>({ resolver: zodResolver(aliasSchema), defaultValues: { alias: '' } });
  const addAlias = useMutation({
    mutationFn: (alias: string) => afiliadosService.criarAlias(afiliadoId, alias),
    onSuccess: ({ data }) => {
      toast.success(data.afiliadoIncorporado ? `Alias criado. "${data.afiliadoIncorporado}" foi incorporado a ${nome} (${data.vendasMovidas} vendas movidas).` : 'Alias criado.');
      aliasForm.reset();
      void qc.invalidateQueries({ queryKey: ['afiliados'] });
    },
    onError: (e) => toast.error(errorText(e, 'Não foi possível criar o alias.')),
  });
  const delAlias = useMutation({
    mutationFn: (id: string) => afiliadosService.removerAlias(afiliadoId, id),
    onSuccess: () => {
      toast.success('Alias removido.');
      setAliasToRemove(null);
      void qc.invalidateQueries({ queryKey: ['afiliados', afiliadoId] });
    },
    onError: () => toast.error('Não foi possível remover o alias.'),
  });

  const regraForm = useForm<RegraForm>({
    resolver: zodResolver(regraSchema),
    defaultValues: { modo: 'FIXO', valorCentavos: null, percentual: '', vigenteDe: '', fonte: '', observacao: '' },
  });
  const modo = regraForm.watch('modo');
  const addRegra = useMutation({
    mutationFn: (v: RegraForm) =>
      afiliadosService.criarRegraComissao(afiliadoId, {
        ...(v.modo === 'FIXO' ? { valorFixoCentavos: v.valorCentavos ?? 0 } : { percentualBps: Math.round(Number(v.percentual.replace(',', '.')) * 100) }),
        vigenteDe: `${v.vigenteDe}T00:00:00-03:00`,
        fonte: v.fonte,
        observacao: v.observacao || undefined,
      }),
    onSuccess: ({ data }) => {
      toast.success(`Regra criada. ${data.vendasRecalculadas} vendas tiveram a comissão do afiliado recalculada.`);
      regraForm.reset();
      void qc.invalidateQueries({ queryKey: ['afiliados'] });
    },
    onError: (e) => toast.error(errorText(e, 'Não foi possível criar a regra.')),
  });

  return (
    <PageGrid cols={2}>
      <Card>
        <CardHeader>
          <CardTitle>Aliases de nome</CardTitle>
          <CardDescription>Outras grafias que pertencem a este afiliado. Nomes apenas parecidos nunca são unidos automaticamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {aliases.error ? <ErrorState error={aliases.error} compact onRetry={() => void aliases.refetch()} /> : (
            <ul className="divide-y divide-border/60 text-[13px]">
              {(aliases.data ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                  <span>{a.alias}</span>
                  {admin && <Button variant="ghost" size="icon-sm" aria-label={`Remover alias ${a.alias}`} onClick={() => setAliasToRemove(a.id)}><Trash2 /></Button>}
                </li>
              ))}
              {!aliases.isPending && (aliases.data?.length ?? 0) === 0 && <li className="py-3 text-xs text-muted-foreground">Nenhum alias cadastrado.</li>}
            </ul>
          )}
          {admin && (
            <form onSubmit={aliasForm.handleSubmit((v) => addAlias.mutate(v.alias))} className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start" noValidate>
              <div className="flex-1 space-y-1">
                <Label htmlFor="novo-alias" className="sr-only">Novo alias</Label>
                <Input id="novo-alias" placeholder="Novo alias de nome" aria-invalid={!!aliasForm.formState.errors.alias} {...aliasForm.register('alias')} />
                {aliasForm.formState.errors.alias && <p role="alert" className="text-xs text-negative">{aliasForm.formState.errors.alias.message}</p>}
              </div>
              <Button type="submit" disabled={addAlias.isPending}>{addAlias.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />} Adicionar</Button>
            </form>
          )}
        </CardContent>
      </Card>

      {verRegras && (
        <Card>
          <CardHeader>
            <CardTitle>Regras de comissão</CardTitle>
            <CardDescription>Valem só onde a fonte não traz a comissão exata do afiliado. Têm vigência, fonte e auditoria.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {regras.error ? <ErrorState error={regras.error} compact onRetry={() => void regras.refetch()} /> : (
              <Table label="Regras de comissão">
                <TableHeader><TableRow><TableHead>Regra</TableHead><TableHead>Vigência</TableHead><TableHead>Fonte</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(regras.data ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.valorFixoCentavos !== null ? `${formatCurrency(r.valorFixoCentavos)} fixos` : `${((r.percentualBps ?? 0) / 100).toLocaleString('pt-BR')}% da venda`}</TableCell>
                      <TableCell className="text-xs">{formatDate(r.vigenteDe)} → {r.vigenteAte ? formatDate(r.vigenteAte) : 'em aberto'}</TableCell>
                      <TableCell className="max-w-48 truncate text-xs text-muted-foreground" title={r.fonte}>{r.fonte}</TableCell>
                    </TableRow>
                  ))}
                  {!regras.isPending && (regras.data?.length ?? 0) === 0 && <TableRow><TableCell colSpan={3} className="py-4 text-center text-xs text-muted-foreground">Nenhuma regra cadastrada.</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
            {admin && (
              <form onSubmit={regraForm.handleSubmit((v) => addRegra.mutate(v))} className="space-y-3 border-t border-border pt-3" noValidate>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="regra-modo">Tipo</Label>
                    <Controller control={regraForm.control} name="modo" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="regra-modo"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="FIXO">Valor fixo por venda</SelectItem><SelectItem value="PERCENTUAL">Percentual da venda</SelectItem></SelectContent>
                      </Select>
                    )} />
                  </div>
                  {modo === 'FIXO' ? (
                    <div className="space-y-1">
                      <Label htmlFor="regra-valor">Valor</Label>
                      <Controller control={regraForm.control} name="valorCentavos" render={({ field }) => <MoneyInput id="regra-valor" value={field.value} onValueChange={field.onChange} aria-invalid={!!regraForm.formState.errors.valorCentavos} />} />
                      {regraForm.formState.errors.valorCentavos && <p role="alert" className="text-xs text-negative">{regraForm.formState.errors.valorCentavos.message}</p>}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor="regra-pct">Percentual (%)</Label>
                      <Input id="regra-pct" inputMode="decimal" placeholder="ex.: 12,5" aria-invalid={!!regraForm.formState.errors.percentual} {...regraForm.register('percentual')} />
                      {regraForm.formState.errors.percentual && <p role="alert" className="text-xs text-negative">{regraForm.formState.errors.percentual.message}</p>}
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="regra-vigencia">Vigente desde</Label>
                    <Controller control={regraForm.control} name="vigenteDe" render={({ field }) => <DateInput id="regra-vigencia" value={field.value} onChange={field.onChange} invalid={!!regraForm.formState.errors.vigenteDe} />} />
                    {regraForm.formState.errors.vigenteDe && <p role="alert" className="text-xs text-negative">{regraForm.formState.errors.vigenteDe.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="regra-fonte">Fonte</Label>
                    <Input id="regra-fonte" placeholder="Contrato, planilha, e-mail..." aria-invalid={!!regraForm.formState.errors.fonte} {...regraForm.register('fonte')} />
                    {regraForm.formState.errors.fonte && <p role="alert" className="text-xs text-negative">{regraForm.formState.errors.fonte.message}</p>}
                  </div>
                </div>
                <Button type="submit" disabled={addRegra.isPending}>{addRegra.isPending && <LoaderCircle className="animate-spin" />} Criar regra</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {admin && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de alterações</CardTitle>
            <CardDescription>Ações administrativas registradas para este afiliado</CardDescription>
          </CardHeader>
          <CardContent>
            {historico.error ? <ErrorState error={historico.error} compact onRetry={() => void historico.refetch()} /> : (
              <ul className="space-y-1.5 text-[13px]">
                {(historico.data ?? []).map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center gap-2">
                    <Badge>{h.acao.replace('afiliado.', '')}</Badge>
                    <span className="text-muted-foreground">{formatDateTime(h.criadoEm)}</span>
                    <span>{h.usuario?.nome ?? 'sistema'}</span>
                  </li>
                ))}
                {!historico.isPending && (historico.data?.length ?? 0) === 0 && <li className="text-xs text-muted-foreground">Nenhuma alteração registrada.</li>}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={aliasToRemove !== null}
        onOpenChange={(o) => !o && setAliasToRemove(null)}
        title="Remover alias?"
        description="As vendas já classificadas continuam com o afiliado atual; novas vendas com esse nome criarão um afiliado separado."
        confirmLabel="Remover"
        destructive
        loading={delAlias.isPending}
        onConfirm={() => aliasToRemove && delAlias.mutate(aliasToRemove)}
      />
    </PageGrid>
  );
}
