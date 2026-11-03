import { ErrorState } from '@/components/feedback/ErrorState';
import { ContentSection } from '@/components/layout/ContentSection';
import { Skeleton } from '@/components/ui/skeleton';
import { useFilters } from '@/hooks/useFilters';
import { useReport } from '@/hooks/useReport';
import { formatCurrency } from '@/lib/currency';
import { callCenterService } from '@/services/call-center.service';
import type { FechamentoContagem } from '@/types/fechamento.types';

const METODO: Record<string, string> = { CARTAO: 'Cartão', BOLETO: 'Boleto', PIX: 'Pix' };
const pedidos = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'pedido' : 'pedidos'}`;
const dia = (iso: string) => iso.split('-').reverse().join('/');

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
export function FechamentoCallCenter() {
  const { range } = useFilters();
  const q = useReport('call-center', 'fechamento', callCenterService.fechamento, { de: range.de, ate: range.ate }, { autoRefresh: false });
  const f = q.data?.data;
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
      description={`Fórmula do fechamento do dono, de ${dia(range.de)} a ${dia(range.ate)}: vendas de origem Call ou Whats pagas no período e ainda pagas, menos os chargebacks de pedidos pagos antes dele. Quem foi estornado no próprio período sai das duas pontas.`}
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

          {temAviso && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">O que ficou de fora ou pede atenção</p>
              <ul className="list-disc space-y-1 pl-4">
                <Aviso c={f.avisos.semOrigem}>vendas pagas no período sem a origem do Pagah (vendedor ainda sem origem cadastrada). Não dá para saber se são Call ou Whats, então não entram.</Aviso>
                <Aviso c={f.avisos.chargebacksSemOrigem}>estornos e chargebacks do período sem a origem do Pagah. Ficam fora do desconto.</Aviso>
                <Aviso c={f.avisos.revertidasNoMes}>vendas do período estornadas ou com chargeback dentro dele. Somem das duas pontas, como na planilha do dono.</Aviso>
                <Aviso c={f.avisos.revertidasDepois}>vendas do período revertidas só depois dele. Não entram agora e pesam no período da reversão.</Aviso>
                <Aviso c={f.avisos.possivelJurosNosChargebacks}>chargebacks de cartão parcelado com valor sem juros igual ao total. Pode haver juros dentro do número.</Aviso>
              </ul>
            </div>
          )}
        </div>
      )}
    </ContentSection>
  );
}
