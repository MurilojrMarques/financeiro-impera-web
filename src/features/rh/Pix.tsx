import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { rhService } from '@/services/rh.service';
import { ApiError } from '@/types/api.types';

const traco = <span className="text-muted-foreground">—</span>;

async function copiar(pix: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(pix);
    toast.success('Chave PIX copiada.');
  } catch {
    toast.error('Não foi possível copiar. Selecione a chave e copie manualmente.');
  }
}

/** A chave PIX na célula da lista: texto selecionável e um botão de copiar. Dado pessoal: só chega para RH, CEO e o próprio. */
export function PixCelula({ pix, nome }: { pix: string | null | undefined; nome: string }) {
  if (!pix) return traco;
  return (
    <span className="inline-flex max-w-56 items-center gap-1.5">
      <span className="truncate font-mono text-xs" title={pix}>{pix}</span>
      <button type="button" className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground" aria-label={`Copiar a chave PIX de ${nome}`} onClick={() => void copiar(pix)}>
        <Copy className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

/** Chave PIX na ficha: copiar para quem vê, e editar para quem pode (o RH). A chave não vem do sistema do RH: é mantida aqui. */
export function PixCampo({ colaboradorId, pix, podeEditar }: { colaboradorId: string; pix: string | null | undefined; podeEditar: boolean }) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(pix ?? '');
  const salvar = useMutation({
    mutationFn: (novo: string | null) => rhService.salvarPix(colaboradorId, novo),
    onSuccess: () => {
      toast.success('Chave PIX salva.');
      setEditando(false);
      void qc.invalidateQueries({ queryKey: ['rh', 'colaborador', colaboradorId] });
      void qc.invalidateQueries({ queryKey: ['rh', 'colaboradores'] });
    },
    onError: (e) => toast.error(e instanceof ApiError && e.status === 422 ? 'A chave PIX não pode ter espaços.' : 'Não foi possível salvar a chave PIX.'),
  });

  if (editando) {
    const valido = /^\S{3,120}$/.test(texto.trim());
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Input className="h-8 w-72" value={texto} maxLength={120} onChange={(e) => setTexto(e.target.value)} aria-label="Chave PIX" placeholder="CPF, CNPJ, e-mail, celular ou chave aleatória" autoFocus />
        <Button size="sm" disabled={!valido || salvar.isPending} onClick={() => salvar.mutate(texto.trim())}><Check className="size-4" aria-hidden /> Salvar</Button>
        {pix && <Button size="sm" variant="ghost" disabled={salvar.isPending} onClick={() => salvar.mutate(null)}>Remover</Button>}
        <Button size="icon" variant="ghost" aria-label="Cancelar" onClick={() => { setTexto(pix ?? ''); setEditando(false); }}><X className="size-4" aria-hidden /></Button>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      {pix ? <span className="break-all font-mono text-sm">{pix}</span> : <span className="text-muted-foreground">Não informada</span>}
      {pix && <button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Copiar a chave PIX" onClick={() => void copiar(pix)}><Copy className="size-4" aria-hidden /></button>}
      {podeEditar && <button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Editar a chave PIX" onClick={() => { setTexto(pix ?? ''); setEditando(true); }}><Pencil className="size-4" aria-hidden /></button>}
    </span>
  );
}
