import { KpiCard } from '@/components/cards/KpiCard';
import { KpiGrid, KpiGroup } from '@/components/cards/KpiGrid';
import { formatCurrency } from '@/lib/currency';
import type { DashboardTrafego } from '@/services/dashboard.service';
import type { DashboardKpis } from '@/types/financial.types';

interface Props {
  /** investimento e ROAS total (só ANALISTA+; omitido para os demais perfis) */
  trafego?: { loading: boolean; data?: DashboardTrafego };
  kpis?: DashboardKpis;
  previous?: DashboardKpis;
  loading: boolean;
  hasComparison: boolean;
  comparisonLoading: boolean;
}

/**
 * Cards da Visão Executiva, em três grupos de 4 (visão geral · receita por grupo · custos e resultado).
 * Valores e totais vêm da API; aqui só se escolhe o que mostrar e como.
 */
export function KpiSection({ trafego, kpis, previous, loading, hasComparison, comparisonLoading }: Props) {
  const cmp = (prev: number | null | undefined) => (hasComparison ? { previous: prev, loading: comparisonLoading } : undefined);
  const custos = kpis?.custos;
  const custosDisp = custos && custos.disponivel ? custos : undefined;
  const prevCustos = previous?.custos && previous.custos.disponivel ? previous.custos : undefined;
  const semCustosCadastrados = !!custosDisp && custosDisp.custosCentavos === 0;
  const restrito = custos && !custos.disponivel ? custos.motivo : undefined;

  const refunds = kpis ? kpis.estornosCentavos + kpis.chargebacksCentavos : undefined;
  const prevRefunds = previous ? previous.estornosCentavos + previous.chargebacksCentavos : undefined;

  return (
    <div className="space-y-5">
      <KpiGroup title="Visão geral">
        <KpiGrid cols={4}>
          <KpiCard label="Receita total" value={kpis?.receitaCentavos} loading={loading} highlight hero comparison={cmp(previous?.receitaCentavos)} description="Front + Back-end Outros + Call Center + Afiliados + Não classificadas" />
          <KpiCard label="Pedidos pagos" format="integer" value={kpis?.pedidos} loading={loading} comparison={cmp(previous?.pedidos)} />
          <KpiCard label="Ticket médio" value={kpis?.ticketMedioCentavos} loading={loading} comparison={cmp(previous?.ticketMedioCentavos)} />
          <KpiCard
            label="Comissão"
            emImplementacao={!trafego}
            value={trafego ? (trafego.data ? (trafego.data.comissaoTotalCentavos ?? undefined) : undefined) : undefined}
            loading={trafego ? trafego.loading : loading}
            unavailableReason="RedTrack indisponível: a comissão do Front depende dele"
            description={trafego?.data ? `Front (MC BR) ${formatCurrency(trafego.data.comissaoFrontCentavos ?? 0)} + Call Center (20%) ${formatCurrency(trafego.data.comissaoCallCenterCentavos)}. Backend, Recuperação e Afiliados: sem comissão por enquanto` : 'Disponível para ANALISTA ou acima'}
          />
        </KpiGrid>
      </KpiGroup>

      {trafego && (
        <KpiGroup title="Tráfego">
          <KpiGrid cols={4}>
            <KpiCard
              label="Investimento em tráfego"
              value={trafego.data ? (trafego.data.investimentoCentavos ?? undefined) : undefined}
              loading={trafego.loading}
              unavailableReason={trafego.data?.mensagem ?? 'RedTrack indisponível ou não configurado'}
              polarity="down-is-good"
              description="RedTrack (ofertas Pagah), o mesmo investimento do Front"
            />
            <KpiCard
              label="ROAS total da operação"
              format="ratio"
              value={trafego.data ? (trafego.data.roasTotalCentesimos === null ? undefined : trafego.data.roasTotalCentesimos / 100) : undefined}
              loading={trafego.loading}
              unavailableReason="Sem investimento do RedTrack no período"
              description={trafego.data ? `Receita total ${formatCurrency(trafego.data.receitaTotalCentavos)} ÷ investimento` : undefined}
            />
          </KpiGrid>
        </KpiGroup>
      )}

      <KpiGroup title="Composição da receita">
        <KpiGrid cols={5}>
          <KpiCard label="Receita Front" value={kpis?.receitaFrontCentavos} loading={loading} comparison={cmp(previous?.receitaFrontCentavos)} />
          <KpiCard
            label="Receita Back-end Outros"
            value={kpis?.receitaBackendOutrosCentavos}
            loading={loading}
            comparison={cmp(previous?.receitaBackendOutrosCentavos)}
            description={kpis ? `Back-end consolidado (com Call Center e Recuperação): ${formatCurrency(kpis.receitaBackendTotalCentavos)}` : undefined}
          />
          <KpiCard label="Receita Call Center" value={kpis?.receitaCallCenterCentavos} loading={loading} comparison={cmp(previous?.receitaCallCenterCentavos)} />
          <KpiCard label="Receita Recuperação de vendas" value={kpis?.receitaRecuperacaoCentavos} loading={loading} comparison={cmp(previous?.receitaRecuperacaoCentavos)} />
          <KpiCard label="Receita Afiliados" value={kpis?.receitaAfiliadosCentavos} loading={loading} comparison={cmp(previous?.receitaAfiliadosCentavos)} />
        </KpiGrid>
      </KpiGroup>

      <KpiGroup title="Custos e resultado">
        <KpiGrid cols={4}>
          <KpiCard
            label="Custos operacionais"
            value={restrito ? undefined : custosDisp?.custosCentavos}
            unavailableReason={restrito}
            loading={loading}
            partial={semCustosCadastrados}
            polarity="down-is-good"
            comparison={restrito ? undefined : cmp(prevCustos?.custosCentavos)}
            description={semCustosCadastrados ? 'Nenhum custo cadastrado: o resultado pode estar superestimado' : undefined}
          />
          <KpiCard
            label="Resultado operacional"
            value={restrito ? undefined : custosDisp?.resultadoOperacionalCentavos}
            unavailableReason={restrito}
            loading={loading}
            partial={semCustosCadastrados}
            valueTone={custosDisp && custosDisp.resultadoOperacionalCentavos < 0 ? 'negative' : 'default'}
            comparison={restrito ? undefined : cmp(prevCustos?.resultadoOperacionalCentavos)}
            description="Receita líquida − custos"
          />
          <KpiCard
            label="Margem operacional"
            format="percent"
            value={restrito ? undefined : custosDisp ? (custosDisp.margemOperacionalPercentual ?? undefined) : undefined}
            unavailableReason={restrito ?? (custosDisp && custosDisp.margemOperacionalPercentual === null ? 'Sem receita no período' : undefined)}
            loading={loading}
            partial={semCustosCadastrados}
            comparison={restrito ? undefined : cmp(prevCustos?.margemOperacionalPercentual)}
          />
          <KpiCard
            label="Estornos e chargebacks"
            value={refunds}
            loading={loading}
            polarity="down-is-good"
            comparison={cmp(prevRefunds)}
            description={kpis ? `${kpis.estornosQtd} estornos · ${kpis.chargebacksQtd} chargebacks` : undefined}
          />
        </KpiGrid>
      </KpiGroup>
    </div>
  );
}
