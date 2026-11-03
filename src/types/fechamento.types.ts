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

/** Uma decisão manual do financeiro sobre um pedido no fechamento do mês; nunca muda a venda, só este fechamento. */
export interface FechamentoAjuste {
  pedido: string;
  acao: 'INCLUIR_VENDA' | 'EXCLUIR_VENDA';
  motivo: string;
  /** `false` quando o ajuste não encontrou efeito (pedido já contado, já revertido ou sem origem Call/Whats) */
  aplicado: boolean;
  /** positivo ao incluir, negativo ao excluir, em centavos */
  efeitoCentavos: number;
}

/** De onde vem a posição dos pedidos: o mês foi fechado numa data, foi pedida na consulta, ou é o fim do período. */
export interface FechamentoPosicao {
  /** AAAA-MM-DD: como estavam os pedidos no começo desse dia; nulo = fim do período */
  em: string | null;
  fonte: 'FECHAMENTO' | 'INFORMADA' | 'FIM_DO_PERIODO';
}

export interface CallCenterFechamento {
  mes: string;
  periodo: { de: string; ate: string };
  vendas: { pedidos: number; totalCentavos: number; porMetodo: FechamentoMetodo[] };
  chargebacks: FechamentoContagem;
  ajustes: FechamentoAjuste[];
  posicao: FechamentoPosicao;
  comissao: { percentual: number; vendasCentavos: number; descontoChargebackCentavos: number; liquidaCentavos: number };
  avisos: {
    semOrigem: FechamentoContagem;
    chargebacksSemOrigem: FechamentoContagem;
    revertidasNoMes: FechamentoContagem;
    revertidasDepois: FechamentoContagem;
    possivelJurosNosChargebacks: FechamentoContagem;
  };
}
