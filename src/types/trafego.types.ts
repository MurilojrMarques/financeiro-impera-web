/** Contrato de GET /trafego/resumo e /trafego/parametros (valores monetários em centavos; percentuais em pontos-base). */
export interface LinhaCusto {
  codigo: string;
  nome: string;
  rotulo: string;
  comoCalculado: string;
  valorCentavos: number | null;
  percentualFaturamentoBp: number | null;
  porPedidoCentavos: number | null;
}

export interface TrafegoResumo {
  faturamentoCentavos: number;
  pedidos: number;
  ticketMedioCentavos: number | null;
  investimentoCentavos: number | null;
  /** ROAS da Pagah × 100 (185 = 1,85): faturamento Pagah ÷ investimento */
  roasCentesimos: number | null;
  /** CPA da Pagah: investimento ÷ pedidos Pagah */
  cpaCentavos: number | null;
  /** Front Revenue do RedTrack (Front + Upsell + Downsells, direto da plataforma); null sem RedTrack */
  frontRevenueRedtrackCentavos: number | null;
  /** ROAS do RedTrack × 100 (o que o tráfego usa para validar oferta e criativo): receita Front do RedTrack ÷ custo */
  roasRedtrackCentesimos: number | null;
  /** CPA do RedTrack: custo ÷ compras do RedTrack */
  cpaRedtrackCentavos: number | null;
  /** MC BR do RedTrack: faturamento Front × 70% − investimento × 110% (base da comissão do pessoal); null sem RedTrack */
  mcBrCentavos: number | null;
  /** comissão do Front = a do sistema de copy (5% do MC BR de cada pessoa) */
  comissaoCopy:
    | { disponivel: true; comissaoCentavos: number; aPagarCentavos: number; estado: 'FECHADO' | 'PROVISORIO'; pessoas: number }
    | { disponivel: false; motivo: string; mensagem: string };
  linhas: LinhaCusto[];
  totalCustosCentavos: number | null;
  totalCustosSemInvestimentoCentavos: number;
  totalCustosPorPedidoCentavos: number | null;
  totalCustosPercentualBp: number | null;
  sobraCentavos: number | null;
  margemBp: number | null;
  metaMargemBp: number;
  remessas: number;
  unidades: number;
  itens: number;
  kitsSemQuantidade: number;
  avisos: string[];
  conferencia: {
    fonteBase: 'PAGAH';
    redtrack: { faturamentoCentavos: number; pedidos: number } | null;
    downsellsRedtrackCentavos: number | null;
    planilha: { faturamentoCentavos: number; pedidos: number };
    diferencaFaturamentoCentavos: number | null;
    diferencaFaturamentoBp: number | null;
    diferencaPedidos: number | null;
  };
}

export interface TrafegoParametros {
  taxaCartaoBp: number;
  pisBp: number;
  cofinsBp: number;
  irpjBp: number;
  csllBp: number;
  freteCentavos: number;
  custoUnitario: { padraoCentavos: number; regras: { contem: string; centavos: number }[] };
  metaMargemBp: number;
  janelaDeslocamentoMin: number;
}

/** GET /call-center/receita-custos */
export interface CallCenterReceitaCustos {
  /** valor sem juros dos pagamentos do período (bruto): base das taxas, como no Front */
  faturamentoCentavos: number;
  /** líquida após estornos e chargebacks (critério ativo) */
  receitaLiquidaCentavos: number;
  pedidos: number;
  ticketMedioCentavos: number | null;
  unidades: number;
  remessas: number;
  linhas: LinhaCusto[];
  totalCustosCentavos: number;
  totalCustosPorPedidoCentavos: number | null;
  totalCustosPercentualBp: number | null;
  /** null = perfil sem permissão para ver custos */
  custosOperacaoCentavos: number | null;
  sobraCentavos: number | null;
  margemBp: number | null;
  kitsSemQuantidade: number;
  avisos: string[];
}
