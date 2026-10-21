import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { retryPolicy } from '@/hooks/useReport';
import { trafegoService } from '@/services/trafego.service';
import { ApiError } from '@/types/api.types';
import type { TrafegoParametros } from '@/types/trafego.types';

/** "0,65" -> 65 pontos-base. Inválido => null. (aritmética inteira: nada de float em dinheiro/percentual) */
export function parsePercentToBp(texto: string): number | null {
  const s = texto.trim().replace('%', '').replace(/\s/g, '');
  if (!/^\d{1,3}(,\d{0,2})?$/.test(s)) return null;
  const [i, f = ''] = s.split(',');
  const bp = Number(i) * 100 + Number((f + '00').slice(0, 2));
  return bp <= 10000 ? bp : null;
}

export const bpToText = (bp: number): string => `${Math.trunc(bp / 100)},${String(bp % 100).padStart(2, '0')}`.replace(/,00$/, '');

interface Estado {
  taxaCartao: string; pis: string; cofins: string; irpj: string; csll: string; meta: string;
  frete: number | null; padrao: number | null;
  regras: { contem: string; centavos: number | null }[];
  deslocamentoH: string;
}

const paraEstado = (p: TrafegoParametros): Estado => ({
  taxaCartao: bpToText(p.taxaCartaoBp), pis: bpToText(p.pisBp), cofins: bpToText(p.cofinsBp), irpj: bpToText(p.irpjBp), csll: bpToText(p.csllBp), meta: bpToText(p.metaMargemBp),
  frete: p.freteCentavos, padrao: p.custoUnitario.padraoCentavos,
  regras: p.custoUnitario.regras.map((r) => ({ contem: r.contem, centavos: r.centavos })),
  deslocamentoH: String(p.janelaDeslocamentoMin / 60).replace('.', ','),
});

function paraParametros(e: Estado): { ok: TrafegoParametros } | { erro: string } {
  const bp = (t: string, nome: string) => {
    const v = parsePercentToBp(t);
    return v === null ? `${nome}: use um percentual entre 0 e 100 (ex.: 0,65)` : v;
  };
  const campos = [['Taxa de cartão', e.taxaCartao], ['PIS', e.pis], ['Cofins', e.cofins], ['IRPJ', e.irpj], ['CSLL', e.csll], ['Margem ideal', e.meta]] as const;
  const v = campos.map(([n, t]) => bp(t, n));
  const erro = v.find((x) => typeof x === 'string');
  if (typeof erro === 'string') return { erro };
  if (e.frete === null) return { erro: 'Frete: informe o valor de uma remessa' };
  if (e.padrao === null) return { erro: 'Custo unitário padrão: informe o valor' };
  if (e.regras.some((r) => !r.contem.trim() || r.centavos === null)) return { erro: 'Regras de custo unitário: preencha o texto e o valor' };
  const horas = Number(e.deslocamentoH.replace(',', '.'));
  if (!Number.isFinite(horas) || Math.abs(horas) > 12 || Math.round(horas * 60) !== horas * 60) return { erro: 'Deslocamento da janela: informe horas entre -12 e 12 (ex.: -3)' };
  const [taxaCartaoBp, pisBp, cofinsBp, irpjBp, csllBp, metaMargemBp] = v as number[];
  return {
    ok: {
      taxaCartaoBp: taxaCartaoBp!, pisBp: pisBp!, cofinsBp: cofinsBp!, irpjBp: irpjBp!, csllBp: csllBp!, metaMargemBp: metaMargemBp!,
      freteCentavos: e.frete, janelaDeslocamentoMin: Math.round(horas * 60),
      custoUnitario: { padraoCentavos: e.padrao, regras: e.regras.map((r) => ({ contem: r.contem.trim(), centavos: r.centavos as number })) },
    },
  };
}

function Linha({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
      <div>
        <Label htmlFor={id}>{label}</Label>
        {hint && <p className="text-xs leading-snug text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** "Ajustar taxas e linhas": percentuais, frete por remessa, custo unitário por produto e janela do dia. O backend valida e audita. */
export function ParametrosDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const q = useQuery({ queryKey: ['trafego', 'parametros'], enabled: open, retry: retryPolicy, queryFn: async ({ signal }) => (await trafegoService.parametros(signal)).data });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Ajustar taxas e linhas</DialogTitle>
          <DialogDescription>Valem para todos os períodos exibidos. As alterações são auditadas.</DialogDescription>
        </DialogHeader>
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} compact />
        ) : !q.data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <Formulario inicial={q.data.parametros} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({ inicial, onClose }: { inicial: TrafegoParametros; onClose: () => void }) {
  const qc = useQueryClient();
  const [e, setE] = useState<Estado>(() => paraEstado(inicial));
  const [erro, setErro] = useState<string | null>(null);

  const salvar = useMutation({
    mutationFn: (p: TrafegoParametros) => trafegoService.salvarParametros(p),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['trafego'] });
      toast.success('Taxas e linhas atualizadas.');
      onClose();
    },
    onError: (err) => setErro(err instanceof ApiError && (err.status === 422 || err.status === 403) ? err.message : 'Não foi possível salvar. Tente novamente.'),
  });

  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => setE((x) => ({ ...x, [k]: v }));

  return (
      <form
        className="space-y-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          const r = paraParametros(e);
          if ('erro' in r) return setErro(r.erro);
          setErro(null);
          salvar.mutate(r.ok);
        }}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Percentuais sobre o faturamento (%)</p>
        <Linha id="p-cartao" label="Taxa de cartão"><Input id="p-cartao" inputMode="decimal" value={e.taxaCartao} onChange={(x) => set('taxaCartao', x.target.value)} className="text-right" /></Linha>
        <Linha id="p-pis" label="PIS"><Input id="p-pis" inputMode="decimal" value={e.pis} onChange={(x) => set('pis', x.target.value)} className="text-right" /></Linha>
        <Linha id="p-cofins" label="Cofins"><Input id="p-cofins" inputMode="decimal" value={e.cofins} onChange={(x) => set('cofins', x.target.value)} className="text-right" /></Linha>
        <Linha id="p-irpj" label="Provisão básica de IRPJ"><Input id="p-irpj" inputMode="decimal" value={e.irpj} onChange={(x) => set('irpj', x.target.value)} className="text-right" /></Linha>
        <Linha id="p-csll" label="Provisão básica de CSLL"><Input id="p-csll" inputMode="decimal" value={e.csll} onChange={(x) => set('csll', x.target.value)} className="text-right" /></Linha>
        <Linha id="p-meta" label="Margem ideal do tráfego" hint="Usada na cor da margem"><Input id="p-meta" inputMode="decimal" value={e.meta} onChange={(x) => set('meta', x.target.value)} className="text-right" /></Linha>

        <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Frete e produto</p>
        <Linha id="p-frete" label="Frete por remessa" hint="Pedidos do mesmo cliente enviados juntos contam um frete só">
          <MoneyInput id="p-frete" value={e.frete} onValueChange={(v) => set('frete', v)} />
        </Linha>
        <Linha id="p-padrao" label="Custo unitário padrão" hint="Por frasco/unidade, para os demais produtos">
          <MoneyInput id="p-padrao" value={e.padrao} onValueChange={(v) => set('padrao', v)} />
        </Linha>
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">Exceções: se o nome do produto contém o texto, usa este custo por unidade (a primeira que casar vale).</p>
          {e.regras.map((r, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_8rem_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
              <Input aria-label={`Texto do produto, regra ${i + 1}`} placeholder="ex.: gelatina" value={r.contem} onChange={(x) => set('regras', e.regras.map((y, j) => (j === i ? { ...y, contem: x.target.value } : y)))} />
              <MoneyInput aria-label={`Custo unitário, regra ${i + 1}`} value={r.centavos} onValueChange={(v) => set('regras', e.regras.map((y, j) => (j === i ? { ...y, centavos: v } : y)))} />
              <Button type="button" variant="ghost" size="icon" className="text-negative" aria-label={`Remover regra ${i + 1}`} onClick={() => set('regras', e.regras.filter((_, j) => j !== i))}><Trash2 /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => set('regras', [...e.regras, { contem: '', centavos: null }])}><Plus /> Adicionar exceção</Button>
        </div>

        <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Janela do dia</p>
        <Linha id="p-janela" label="Deslocamento (horas)" hint="0 = o dia da Pagah (meia-noite a meia-noite de Brasília); só mude se souber o motivo">
          <Input id="p-janela" inputMode="decimal" value={e.deslocamentoH} onChange={(x) => set('deslocamentoH', x.target.value)} className="text-right" />
        </Linha>

        {erro && <p role="alert" className="text-sm text-negative">{erro}</p>}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={salvar.isPending}>{salvar.isPending && <LoaderCircle className="animate-spin" />} Salvar</Button>
        </DialogFooter>
      </form>
  );
}
