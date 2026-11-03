import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ContentSection } from '@/components/layout/ContentSection';
import { Skeleton } from '@/components/ui/skeleton';
import { useFilters } from '@/hooks/useFilters';
import { useReport } from '@/hooks/useReport';
import { formatCurrency } from '@/lib/currency';
import { callCenterService } from '@/services/call-center.service';
import { ApiError } from '@/types/api.types';
import type { FechamentoContagem } from '@/types/fechamento.types';

const METODO: Record<string, string> = { CARTAO: 'Cartão', BOLETO: 'Boleto', PIX: 'Pix' };
const pedidos = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'pedido' : 'pedidos'}`;
const dia = (iso: string) => iso.split('-').reverse().join('/');

/** AAAA-MM quando o período é o mês inteiro (dia 1 ao último dia); só um mês inteiro se fecha. */
function competenciaDe(de: string, ate: string): string | null {
  const mes = de.slice(0, 7);
  const [a, m] = mes.split('-').map(Number) as [number, number];
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return de === `${mes}-01` && ate === `${mes}-${String(ultimo).padStart(2, '0')}` ? mes : null;
}

const erroTexto = (e: unknown, padrao: string) => (e instanceof ApiError && (e.status === 409 || e.status === 422) ? e.message : padrao);

function Aviso({ c, children }: { c: FechamentoContagem; children: string }) {
  if (c.pedidos === 0) return null;
  return (
    <li>
      <strong className="font-medium text-foreground">
        {pedidos(c.pedidos)} ({formatCurrency(c.totalCentavos)}):
      </strong>{' '}
      {children}
    </li>
  );
}

const TH = 'py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground';

/**
 * O fechamento do Call Center na fórmula da planilha do dono ("Fechamento", aba do arquivo dele), para o período do filtro
 * do topo: vendas de origem Call ou Whats pagas no período e ainda pagas, a 20%, menos os chargebacks de pedidos pagos
 * antes do período. Só Financeiro e Administrador. Os números vêm do que o Pagah entrega direto: a origem sai do
 * vendedor de cada pedido.
 */
export function FechamentoCallCenter({ posicao, onPosicao }: { posicao: string; onPosicao: (v: string) => void }) {
  const { range } = useFilters();
  const q = useReport('call-center', 'fechamento', callCenterService.fechamento, { de: range.de, ate: range.ate, ...(posicao ? { posicao } : {}) }, { autoRefresh: false });
  const f = q.data?.data;
  const qc = useQueryClient();
  const competencia = competenciaDe(range.de, range.ate);
  const fechadoEm = f?.posicao.fonte === 'FECHAMENTO' ? f.posicao.em : null;
  const atualizar = () => void qc.invalidateQueries({ queryKey: ['call-center'] });
  const fechar = useMutation({
    mutationFn: () => callCenterService.fecharMes(competencia!, posicao),
    onSuccess: () => {
      toast.success(`Mês fechado em ${dia(posicao)}: a tela passa a mostrar os pedidos como estavam nesse dia.`);
      onPosicao('');
      atualizar();
    },
    onError: (e) => toast.error(erroTexto(e, 'Não foi possível fechar o mês.')),
  });
  const reabrir = useMutation({
    mutationFn: () => callCenterService.reabrirMes(competencia!),
    onSuccess: () => {
      toast.success('Mês reaberto: o fechamento volta a usar o fim do período.');
      atualizar();
    },
    onError: (e) => toast.error(erroTexto(e, 'Não foi possível reabrir o mês.')),
  });
  const temAviso =
    f !== undefined &&
    f.avisos.semOrigem.pedidos +
      f.avisos.chargebacksSemOrigem.pedidos +
      f.avisos.revertidasNoMes.pedidos +
      f.avisos.revertidasDepois.pedidos +
      f.avisos.possivelJurosNosChargebacks.pedidos >
      0;
  const pct = f ? `${Math.round(f.comissao.percentual * 100)}%` : '20%';

  return (
    <ContentSection
      title="Fechamento do Call Center"
      description={`Fórmula do fechamento do dono, de ${dia(range.de)} a ${dia(range.ate)}: vendas de origem Call ou Whats pagas no período e ainda pagas ${f?.posicao.em ? `na posição de ${dia(f.posicao.em)}${fechadoEm ? ' (data em que o mês foi fechado)' : ''}` : 'no fim dele'}, menos os chargebacks de pedidos pagos antes dele. Quem foi estornado no próprio período sai das duas pontas.`}
      actions={
        fechadoEm && !posicao ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-md border border-border bg-muted/50 px-2 py-1 text-foreground">Mês fechado em {dia(fechadoEm)}</span>
            <button type="button" disabled={reabrir.isPending} onClick={() => reabrir.mutate()} className="text-xs text-muted-foreground underline underline-offset-2">
              reabrir
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <label
              className="flex items-center gap-2"
              title="Como estavam os pedidos no começo deste dia. Vazio = fim do período. Serve para comparar com um arquivo exportado depois do fim do período."
            >
              Posição em
              <input
                type="date"
                value={posicao}
                min={range.ate}
                onChange={(e) => onPosicao(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>
            {posicao && (
              <button type="button" onClick={() => onPosicao('')} className="text-xs underline underline-offset-2">
                fim do período
              </button>
            )}
            {posicao && competencia && (
              <button
                type="button"
                disabled={fechar.isPending}
                onClick={() => fechar.mutate()}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-muted"
                title="Guarda esta data como a do fechamento do mês: a tela passa a mostrar sempre o mesmo número, sem escolher a data."
              >
                Fechar o mês nesta data
              </button>
            )}
          </div>
        )
      }
    >
      {q.isError && !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.isPending || !f ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="pb-2 text-left text-xs font-semibold uppercase tracking-wide">Vendas Call Center</caption>
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className={TH}>Pagamento</th>
                    <th className={`${TH} text-right`}>Total de vendas</th>
                    <th className={`${TH} text-right`}>Taxa</th>
                    <th className={`${TH} text-right`}>Taxa final</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {f.vendas.porMetodo.map((m) => (
                    <tr key={m.metodo} className="border-b border-border/60">
                      <td className="py-2">
                        {METODO[m.metodo] ?? m.metodo} <span className="text-xs text-muted-foreground">({m.pedidos.toLocaleString('pt-BR')})</span>
                      </td>
                      <td className="py-2 text-right">{formatCurrency(m.totalCentavos)}</td>
                      <td className="py-2 text-right">{pct}</td>
                      <td className="py-2 text-right">{formatCurrency(m.comissaoCentavos)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-border font-semibold">
                    <td className="py-2">
                      Total vendas <span className="text-xs font-normal text-muted-foreground">({f.vendas.pedidos.toLocaleString('pt-BR')})</span>
                    </td>
                    <td className="py-2 text-right">{formatCurrency(f.vendas.totalCentavos)}</td>
                    <td className="py-2 text-right">Comissão</td>
                    <td className="py-2 text-right">{formatCurrency(f.comissao.vendasCentavos)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="pb-2 text-left text-xs font-semibold uppercase tracking-wide">Charges Call Center</caption>
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className={TH}>Charges</th>
                      <th className={`${TH} text-right`}>Total</th>
                      <th className={`${TH} text-right`}>Taxa</th>
                      <th className={`${TH} text-right`}>Desconto</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    <tr className="border-b border-border/60">
                      <td className="py-2">
                        Chargebacks e estornos <span className="text-xs text-muted-foreground">({f.chargebacks.pedidos.toLocaleString('pt-BR')})</span>
                      </td>
                      <td className="py-2 text-right">{formatCurrency(f.chargebacks.totalCentavos)}</td>
                      <td className="py-2 text-right">{pct}</td>
                      <td className="py-2 text-right">{formatCurrency(f.comissao.descontoChargebackCentavos)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="pb-2 text-left text-xs font-semibold uppercase tracking-wide">Total do Call Center</caption>
                  <tbody className="tabular-nums">
                    <tr className="border-b border-border/60">
                      <td className="py-2">Vendas Call Center</td>
                      <td className="py-2 text-right">{formatCurrency(f.comissao.vendasCentavos)}</td>
                    </tr>
                    <tr className="border-b border-border/60">
                      <td className="py-2">Desconto chargeback</td>
                      <td className="py-2 text-right text-destructive">−{formatCurrency(f.comissao.descontoChargebackCentavos)}</td>
                    </tr>
                    <tr className="font-semibold">
                      <td className="py-2">Total final</td>
                      <td className="py-2 text-right">{formatCurrency(f.comissao.liquidaCentavos)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="pt-2 text-xs text-muted-foreground">
                  As taxas de Pagarme e Appmax que entram no total final da planilha do dono não estão aqui: dependem da operadora de cada pedido.
                </p>
              </div>
            </div>
          </div>

          {f.ajustes.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
              <p className="mb-1 font-medium text-foreground">Ajustes manuais neste fechamento</p>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {f.ajustes.map((a) => (
                  <li key={`${a.pedido}-${a.acao}`}>
                    <strong className="font-medium text-foreground">
                      Pedido {a.pedido} {a.acao === 'INCLUIR_VENDA' ? 'incluído como venda' : 'retirado das vendas'}
                      {a.aplicado ? ` (${a.efeitoCentavos > 0 ? '+' : '−'}${formatCurrency(Math.abs(a.efeitoCentavos))})` : ' (sem efeito: o pedido já conta, foi revertido ou não é Call/Whats)'}:
                    </strong>{' '}
                    {a.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {temAviso && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">O que ficou de fora ou pede atenção</p>
              <ul className="list-disc space-y-1 pl-4">
                <Aviso c={f.avisos.semOrigem}>vendas pagas no período sem a origem do Pagah (vendedor ainda sem origem cadastrada). Não dá para saber se são Call ou Whats, então não entram.</Aviso>
                <Aviso c={f.avisos.chargebacksSemOrigem}>estornos e chargebacks do período sem a origem do Pagah. Ficam fora do desconto.</Aviso>
                <Aviso c={f.avisos.revertidasNoMes}>vendas do período estornadas ou com chargeback dentro dele. Somem das duas pontas, como na planilha do dono.</Aviso>
                <Aviso c={f.avisos.revertidasDepois}>vendas do período revertidas só depois dele. Contam como venda agora, e a reversão pesa no período seguinte.</Aviso>
                <Aviso c={f.avisos.possivelJurosNosChargebacks}>chargebacks de cartão parcelado com valor sem juros igual ao total. Pode haver juros dentro do número.</Aviso>
              </ul>
            </div>
          )}
        </div>
      )}
    </ContentSection>
  );
}
