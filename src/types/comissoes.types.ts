/** Contrato de GET /comissoes/resumo (valores em centavos). */
export interface ComissaoPessoa {
  copywriterId: string;
  nome: string;
  mcBrCentavos: number;
  /** 5% do MC BR (pode ser negativa) */
  comissaoCentavos: number;
  /** o que se paga de fato: piso em 0 */
  aPagarCentavos: number;
}

export type ComissaoFront =
  | {
      disponivel: true;
      estado: 'FECHADO' | 'PROVISORIO';
      comissaoCentavos: number;
      aPagarCentavos: number;
      mcBrComissionavelCentavos: number;
      mcBrSemComissaoCentavos: number;
      /** só para FINANCEIRO ou acima */
      pessoas: ComissaoPessoa[] | null;
      quantidadePessoas: number;
    }
  | { disponivel: false; motivo: string; mensagem: string };

export interface ComissoesResumo {
  front: ComissaoFront;
  callCenter: { regra: string; baseCentavos: number; comissaoCentavos: number };
  recuperacao: { regra: string; baseCentavos: number; comissaoCentavos: number };
  afiliados: { regra: string; comissaoCentavos: number };
  backendOutros: { emImplementacao: true; mensagem: string };
  totalCentavos: number;
  /** true = a comissão do Front não entrou no total */
  totalSemFront: boolean;
}
