import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DateInput } from '@/components/forms/DateInput';
import { FileUpload, validateFile } from '@/components/forms/FileUpload';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { retryPolicy } from '@/hooks/useReport';
import { PERIODICIDADE_LABEL } from '@/lib/formatters';
import { custosService } from '@/services/custos.service';
import { ApiError } from '@/types/api.types';
import type { Custo, Periodicidade } from '@/types/financial.types';
import { costSchema, RECORRENCIAS, STATUS_LABEL, STATUS_PAGAMENTO, type CostFormInput, type CostFormValues } from './cost-schemas';

interface Props {
  /** grupo de receita ao qual o custo é atribuído (ex.: CALL_CENTER) */
  grupo?: string;
  /** edição quando informado */
  initial?: Custo;
  onSaved?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

function Field({ id, label, error, children, className }: { id: string; label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error && <p id={`${id}-erro`} role="alert" className="mt-1 text-xs text-negative">{error}</p>}
    </div>
  );
}

export function useCategorias() {
  return useQuery({
    queryKey: ['custos', 'categorias'],
    queryFn: async ({ signal }) => (await custosService.categorias(signal)).data,
    staleTime: 60_000,
    retry: retryPolicy,
  });
}

/**
 * Lançamento de custo. Fluxo de criação: (1) cria a recorrência no backend quando não é "Único" (nada é simulado no
 * frontend), (2) cria o custo, (3) envia o anexo. O botão fica bloqueado durante o envio (evita lançamento duplicado).
 */
export function CostForm({ grupo, initial, onSaved, onCancel, submitLabel }: Props) {
  const qc = useQueryClient();
  const editing = !!initial;
  const categorias = useCategorias();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<CostFormInput, unknown, CostFormValues>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      descricao: initial?.descricao ?? '',
      categoriaId: initial?.categoria.id ?? '',
      recorrencia: initial?.recorrencia ? (initial.recorrencia.periodicidade as Periodicidade) : 'UNICO',
      valorCentavos: initial?.valorCentavos ?? null,
      vencimento: initial?.vencimento.slice(0, 10) ?? '',
      statusPagamento: initial?.statusPagamento ?? 'PENDENTE',
      observacao: initial?.observacao ?? '',
    },
  });

  const save = useMutation({
    mutationFn: async (v: CostFormValues): Promise<{ anexoFalhou: boolean }> => {
      const valorCentavos = v.valorCentavos;
      if (editing && initial) {
        await custosService.atualizar(initial.id, {
          descricao: v.descricao, categoriaId: v.categoriaId, valorCentavos, vencimento: v.vencimento,
          statusPagamento: v.statusPagamento, observacao: v.observacao || undefined,
        });
        if (file) {
          try { await custosService.enviarAnexo(initial.id, file); } catch { return { anexoFalhou: true }; }
        }
        return { anexoFalhou: false };
      }
      let recorrenciaId: string | undefined;
      if (v.recorrencia !== 'UNICO') {
        recorrenciaId = (await custosService.criarRecorrencia({ periodicidade: v.recorrencia, inicio: v.vencimento })).data.id;
      }
      const criado = (
        await custosService.criar({
          descricao: v.descricao, tipo: v.recorrencia === 'UNICO' ? 'VARIAVEL' : 'FIXO', categoriaId: v.categoriaId, recorrenciaId,
          grupo, valorCentavos, vencimento: v.vencimento, statusPagamento: v.statusPagamento, observacao: v.observacao || undefined,
        })
      ).data;
      if (file) {
        try { await custosService.enviarAnexo(criado.id, file); } catch { return { anexoFalhou: true }; }
      }
      return { anexoFalhou: false };
    },
    onSuccess: ({ anexoFalhou }) => {
      if (anexoFalhou) toast.warning('Custo salvo, mas o anexo não pôde ser enviado. Reenvie pelo botão de anexos.');
      else toast.success(editing ? 'Custo atualizado.' : 'Custo lançado.');
      void qc.invalidateQueries();
      if (!editing) {
        reset({ descricao: '', categoriaId: '', recorrencia: 'UNICO', valorCentavos: null, vencimento: '', statusPagamento: 'PENDENTE', observacao: '' });
      }
      setFile(null);
      setServerError(null);
      onSaved?.();
    },
    onError: (e) => {
      const msg = e instanceof ApiError && (e.status === 422 || e.status === 409) ? e.message : e instanceof ApiError && e.isForbidden ? 'Você não tem permissão para esta ação.' : 'Não foi possível salvar o custo. Tente novamente.';
      setServerError(msg);
      toast.error(msg);
    },
  });

  const onSubmit = handleSubmit((v) => {
    if (save.isPending) return; // proteção extra contra duplo clique
    if (file) {
      const err = validateFile(file);
      if (err) { setFileError(err); return; }
    }
    setFileError(null);
    setServerError(null);
    save.mutate(v);
  });

  const ativas = (categorias.data ?? []).filter((c) => c.ativa || c.id === initial?.categoria.id);

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label={editing ? 'Editar custo' : 'Novo lançamento'}>
      <Field id="custo-descricao" label="Custo" error={errors.descricao?.message} className="sm:col-span-2">
        <Input id="custo-descricao" placeholder="Descrição do custo" aria-invalid={!!errors.descricao} aria-describedby={errors.descricao ? 'custo-descricao-erro' : undefined} {...register('descricao')} />
      </Field>

      <Field id="custo-tipo" label="Tipo" error={errors.categoriaId?.message}>
        <Controller control={control} name="categoriaId" render={({ field }) => (
          <Select value={field.value || undefined} onValueChange={field.onChange}>
            <SelectTrigger id="custo-tipo" aria-invalid={!!errors.categoriaId}><SelectValue placeholder={categorias.isPending ? 'Carregando…' : 'Selecione o tipo'} /></SelectTrigger>
            <SelectContent>
              {ativas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              {!categorias.isPending && ativas.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum tipo cadastrado. Crie em "Editar tipos e recorrências".</div>}
            </SelectContent>
          </Select>
        )} />
      </Field>

      <Field id="custo-recorrencia" label="Recorrência" error={errors.recorrencia?.message}>
        <Controller control={control} name="recorrencia" render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange} disabled={editing}>
            <SelectTrigger id="custo-recorrencia"><SelectValue /></SelectTrigger>
            <SelectContent>{RECORRENCIAS.map((r) => <SelectItem key={r} value={r}>{PERIODICIDADE_LABEL[r]}</SelectItem>)}</SelectContent>
          </Select>
        )} />
        {editing && <p className="mt-1 text-[11px] text-muted-foreground">A recorrência não pode ser alterada após o lançamento.</p>}
      </Field>

      <Field id="custo-valor" label="Valor (R$)" error={errors.valorCentavos?.message}>
        <Controller control={control} name="valorCentavos" render={({ field }) => (
          <MoneyInput id="custo-valor" value={field.value} onValueChange={field.onChange} aria-invalid={!!errors.valorCentavos} aria-describedby={errors.valorCentavos ? 'custo-valor-erro' : undefined} />
        )} />
      </Field>

      <Field id="custo-vencimento" label="Vencimento" error={errors.vencimento?.message}>
        <Controller control={control} name="vencimento" render={({ field }) => <DateInput id="custo-vencimento" value={field.value} onChange={field.onChange} invalid={!!errors.vencimento} />} />
      </Field>

      <Field id="custo-status" label="Status do pagamento" error={errors.statusPagamento?.message}>
        <Controller control={control} name="statusPagamento" render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="custo-status"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_PAGAMENTO.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
          </Select>
        )} />
      </Field>

      <Field id="custo-anexo" label="Anexo" className="sm:col-span-1">
        <FileUpload id="custo-anexo" file={file} onChange={(f) => { setFile(f); setFileError(f ? validateFile(f) : null); }} error={fileError} />
      </Field>

      <Field id="custo-obs" label="Observação" error={errors.observacao?.message} className="sm:col-span-2">
        <Textarea id="custo-obs" rows={2} placeholder="Opcional" {...register('observacao')} />
      </Field>

      {serverError && <p role="alert" className="rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-negative sm:col-span-2">{serverError}</p>}

      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        {onCancel && <Button variant="secondary" onClick={onCancel} disabled={save.isPending}>Cancelar</Button>}
        <Button type="submit" disabled={save.isPending || !!fileError}>
          {save.isPending && <LoaderCircle className="animate-spin" />}
          {save.isPending ? 'Salvando…' : (submitLabel ?? (editing ? 'Salvar alterações' : 'Lançar'))}
        </Button>
      </div>
    </form>
  );
}
