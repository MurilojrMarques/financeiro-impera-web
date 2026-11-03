/** `GET /call-center/fechamento?mes=AAAA-MM`: o fechamento do Call Center na fórmula da planilha do dono. Dinheiro em centavos. */
export interface FechamentoMetodo {
  metodo: 'CARTAO' | 'BOLETO' | 'PIX';
  pedidos: number;
  totalCentavos: number;
  comissaoCentavos: number;
}

export interface FechamentoContagem {
  pedidos: number;
  totalCentavos: number;
}

export interface CallCenterFechamento {
  mes: string;
  periodo: { de: string; ate: string };
  vendas: { pedidos: number; totalCentavos: number; porMetodo: FechamentoMetodo[] };
  chargebacks: FechamentoContagem;
  comissao: { percentual: number; vendasCentavos: number; descontoChargebackCentavos: number; liquidaCentavos: number };
  avisos: {
    semOrigem: FechamentoContagem;
    chargebacksSemOrigem: FechamentoContagem;
    revertidasNoMes: FechamentoContagem;
    revertidasDepois: FechamentoContagem;
    possivelJurosNosChargebacks: FechamentoContagem;
  };
}
