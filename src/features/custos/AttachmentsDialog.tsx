import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, LoaderCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { FileUpload, validateFile } from '@/components/forms/FileUpload';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { retryPolicy } from '@/hooks/useReport';
import { formatDateTime } from '@/lib/dates';
import { formatBytes } from '@/lib/formatters';
import { custosService } from '@/services/custos.service';
import type { Custo } from '@/types/financial.types';

interface Props {
  custo: Custo | null;
  canWrite: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Anexos privados: baixados com autenticação (blob) — nunca por URL pública. */
export function AttachmentsDialog({ custo, canWrite, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const id = custo?.id ?? '';

  const anexos = useQuery({
    queryKey: ['custos', id, 'anexos'],
    enabled: !!custo,
    retry: retryPolicy,
    queryFn: async ({ signal }) => (await custosService.anexos(id, signal)).data,
  });

  const upload = useMutation({
    mutationFn: (f: File) => custosService.enviarAnexo(id, f),
    onSuccess: () => {
      toast.success('Anexo enviado.');
      setFile(null);
      void qc.invalidateQueries({ queryKey: ['custos'] });
    },
    onError: () => toast.error('Não foi possível enviar o anexo.'),
  });

  const remove = useMutation({
    mutationFn: (anexoId: string) => custosService.removerAnexo(id, anexoId),
    onSuccess: () => {
      toast.success('Anexo removido.');
      void qc.invalidateQueries({ queryKey: ['custos'] });
    },
    onError: () => toast.error('Não foi possível remover o anexo.'),
  });

  const download = useMutation({
    mutationFn: async ({ anexoId, nome }: { anexoId: string; nome: string }) => {
      const blob = await custosService.baixarAnexo(id, anexoId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onError: () => toast.error('Não foi possível baixar o anexo.'),
  });

  return (
    <Dialog open={!!custo} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anexos</DialogTitle>
          <DialogDescription>{custo?.descricao}</DialogDescription>
        </DialogHeader>

        {anexos.error ? (
          <ErrorState error={anexos.error} compact onRetry={() => void anexos.refetch()} />
        ) : anexos.isPending ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {(anexos.data ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">{a.nomeOriginal}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(a.tamanhoBytes)} · {formatDateTime(a.criadoEm)}</span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label={`Baixar ${a.nomeOriginal}`} disabled={download.isPending} onClick={() => download.mutate({ anexoId: a.id, nome: a.nomeOriginal })}>
                    {download.isPending && download.variables?.anexoId === a.id ? <LoaderCircle className="animate-spin" /> : <Download />}
                  </Button>
                  {canWrite && (
                    <Button variant="ghost" size="icon-sm" aria-label={`Remover ${a.nomeOriginal}`} disabled={remove.isPending} onClick={() => remove.mutate(a.id)}>
                      <Trash2 />
                    </Button>
                  )}
                </span>
              </li>
            ))}
            {(anexos.data?.length ?? 0) === 0 && <li className="py-4 text-center text-xs text-muted-foreground">Nenhum anexo.</li>}
          </ul>
        )}

        {canWrite && (
          <div className="space-y-2 border-t border-border pt-3">
            <FileUpload id="novo-anexo" file={file} onChange={(f) => { setFile(f); setFileError(f ? validateFile(f) : null); }} error={fileError} disabled={upload.isPending} />
            {file && !fileError && (
              <Button onClick={() => upload.mutate(file)} disabled={upload.isPending}>
                {upload.isPending && <LoaderCircle className="animate-spin" />} Enviar anexo
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
