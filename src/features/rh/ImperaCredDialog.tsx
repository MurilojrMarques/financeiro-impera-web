import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { retryPolicy } from '@/hooks/useReport';
import { rhService } from '@/services/rh.service';
import { ApiError } from '@/types/api.types';
import { mesLabel } from './rh-format';

const mesSeguinte = (competencia: string): string => {
  const [a, m] = competencia.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 7);
};

/**
 * ImperaCred = adiantamento de salário. Lançado no mês em que a pessoa recebeu; a folha do mês seguinte desconta o valor inteiro
 * (recebe 5.000, adianta 2.500 => no mês seguinte recebe 2.500). O RH lança e apaga; o CEO só vê.
 */
export function ImperaCredDialog({ open, onOpenChange, competencia, podeEditar }: { open: boolean; onOpenChange: (o: boolean) => void; competencia: string; podeEditar: boolean }) {
  const qc = useQueryClient();
  const [colaboradorId, setColaboradorId] = useState('');
  const [valor, setValor] = useState<number | null>(null);
  const [obs, setObs] = useState('');
  const seguinte = mesSeguinte(competencia);

  const lista = useQuery({
    queryKey: ['rh', 'imperacred', competencia],
    enabled: open,
    retry: retryPolicy,
    queryFn: async ({ signal }) => (await rhService.imperaCred(competencia, signal)).data,
  });
  const pessoas = useQuery({
    queryKey: ['rh', 'colaboradores-imperacred'],
    enabled: open && podeEditar,
    staleTime: 5 * 60_000,
    retry: retryPolicy,
    queryFn: async ({ signal }) => (await rhService.colaboradores({ limit: 100, ativo: true }, signal)).data,
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['rh', 'imperacred'] });
    void qc.invalidateQueries({ queryKey: ['rh', 'folha'] });
    void qc.invalidateQueries({ queryKey: ['rh', 'folhas'] });
  };
  const erro = (e: unknown, padrao: string) => toast.error(e instanceof ApiError && (e.status === 409 || e.status === 422) ? e.message : padrao);
  const lancar = useMutation({
    mutationFn: () => rhService.lancarImperaCred({ colaboradorId, competencia, valorCentavos: valor ?? 0, observacao: obs.trim() || undefined }),
    onSuccess: () => {
      setValor(null);
      setObs('');
      toast.success(`ImperaCred lançado: será descontado na folha de ${mesLabel(seguinte)}.`);
      refresh();
    },
    onError: (e) => erro(e, 'Não foi possível lançar o ImperaCred.'),
  });
  const remover = useMutation({
    mutationFn: (id: string) => rhService.removerImperaCred(id),
    onSuccess: () => {
      toast.success('ImperaCred removido.');
      refresh();
    },
    onError: (e) => erro(e, 'Não foi possível remover o ImperaCred.'),
  });

  const d = lista.data;
  const fechada = d?.folhaDoDesconto?.status === 'FECHADA';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>ImperaCred de {mesLabel(competencia)}</DialogTitle>
          <DialogDescription>
            Adiantamento de salário feito em {mesLabel(competencia)}. O valor inteiro é descontado na folha de {mesLabel(seguinte)}: quem recebe R$ 5.000 e adianta R$ 2.500 recebe R$ 2.500 no mês seguinte.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {podeEditar && !fechada && (
            <div className="flex flex-wrap items-end gap-2">
              <Select value={colaboradorId} onValueChange={setColaboradorId}>
                <SelectTrigger className="h-9 w-56" aria-label="Colaborador"><SelectValue placeholder="Colaborador" /></SelectTrigger>
                <SelectContent>{(pessoas.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
              <MoneyInput className="h-9 w-36" aria-label="Valor do adiantamento" value={valor} onValueChange={setValor} />
              <Input className="h-9 min-w-40 flex-1" placeholder="Observação (opcional)" value={obs} maxLength={300} onChange={(e) => setObs(e.target.value)} aria-label="Observação" />
              <Button disabled={!colaboradorId || !valor || lancar.isPending} onClick={() => lancar.mutate()}><Plus className="size-4" aria-hidden /> Lançar</Button>
            </div>
          )}
          {fechada && <p className="text-sm text-muted-foreground">A folha de {mesLabel(seguinte)} já está fechada: não dá mais para lançar nem apagar ImperaCred deste mês.</p>}
          <ul className="divide-y rounded-md border text-sm">
            {(d?.itens ?? []).length === 0 && <li className="p-3 text-muted-foreground">Nenhum ImperaCred lançado em {mesLabel(competencia)}.</li>}
            {(d?.itens ?? []).map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 p-3">
                <span><span className="font-medium">{i.colaborador.nome}</span>{i.observacao ? <span className="text-muted-foreground"> · {i.observacao}</span> : null}</span>
                <span className="flex items-center gap-2">
                  <CurrencyValue centavos={i.valorCentavos} />
                  {podeEditar && !fechada && <Button variant="ghost" size="icon" aria-label={`Remover o ImperaCred de ${i.colaborador.nome}`} disabled={remover.isPending} onClick={() => remover.mutate(i.id)}><Trash2 className="size-4" aria-hidden /></Button>}
                </span>
              </li>
            ))}
            {d && d.itens.length > 0 && (
              <li className="flex items-center justify-between gap-2 bg-muted/40 p-3 font-medium"><span>Total a descontar em {mesLabel(seguinte)}</span><CurrencyValue centavos={d.totalCentavos} /></li>
            )}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
