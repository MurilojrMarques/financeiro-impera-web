/**
 * Contratos das respostas financeiras da API Express. Todos os valores monetários chegam em CENTAVOS INTEIROS
 * (campos `*Centavos`). Percentuais já vêm como número (ex.: 12.35 = 12,35%).
 */

export interface Metricas {
  pedidos: number;
  brutoCentavos: number;
  receitaCentavos: number;
  comissaoCentavos: number;
  /** comissão do AFILIADO (distinta da comissão da operação, que é o que a Impera recebe) */
  comissaoAfiliadoCentavos: number;
  comissaoAfiliadoEstimadaCentavos: number;
  comissaoEstimadaCentavos: number;
  x1ComissaoRealCentavos: number;
  pedidosSemComissao: number;
  taxaCallCenterCentavos: number;
  estornosCentavos: number;
  estornosQtd: number;
  chargebacksCentavos: number;
  chargebacksQtd: number;
}

export interface MetricasFormatadas extends Metricas {
  ticketMedioCentavos: number;
}

export interface Alerta {
  codigo: string;
  severidade: 'info' | 'aviso' | 'critico';
  mensagem: string;
  quantidade?: number;
}

export interface ResumoComAlertas extends MetricasFormatadas {
  alertas: Alerta[];
}

/** Linha de agrupamento (por loja, produto, método, campanha...). `chave` null = valor não informado na origem. */
export type DimRow = MetricasFormatadas & { chave: string | null; id?: string };
export type SerieRow = MetricasFormatadas & { periodo: string };

// ── Dashboard ──────────────────────────────────────────────

export type CustosKpi =
  | { disponivel: true; custosCentavos: number; resultadoOperacionalCentavos: number; margemOperacionalPercentual: number | null }
  | { disponivel: false; motivo: string };

export interface DashboardKpis extends MetricasFormatadas {
  receitaFrontCentavos: number;
  receitaBackendOutrosCentavos: number;
  receitaCallCenterCentavos: number;
  receitaRecuperacaoCentavos: number;
  receitaAfiliadosCentavos: number;
  receitaNaoClassificadaCentavos: number;
  receitaBackendTotalCentavos: number;
  custos: CustosKpi;
}

export interface ReceitasPorGrupo {
  grupos: {
    front: MetricasFormatadas;
    backendOutros: MetricasFormatadas;
    callCenter: MetricasFormatadas;
    recuperacao: MetricasFormatadas;
    afiliados: MetricasFormatadas;
    naoClassificadas: MetricasFormatadas;
  };
  backendTotal: MetricasFormatadas;
  geral: MetricasFormatadas;
  composicao: { receitaGeral: string; backendTotal: string };
}

export interface DashboardResumo {
  kpis: DashboardKpis;
  receitasPorGrupo: ReceitasPorGrupo;
  alertas: Alerta[];
}

export type GrupoReceita = 'FRONT' | 'BACKEND_OUTROS' | 'CALL_CENTER' | 'RECUPERACAO' | 'AFILIADO' | 'NAO_CLASSIFICADA';

export interface DistribuicaoReceitas {
  totalCentavos: number;
  distribuicao: { grupo: GrupoReceita; receitaCentavos: number; participacaoPercentual: number | null }[];
  backendTotal: { receitaCentavos: number; participacaoPercentual: number | null; nota: string };
}

export interface Indicador {
  codigo: string;
  valor: number | null;
  unidade: 'centavos' | 'quantidade' | 'percentual';
  disponivel: boolean;
  metodologia: string;
}

// ── Vendas ─────────────────────────────────────────────────

export type StatusVenda = 'PAGO' | 'ESTORNADO' | 'CHARGEBACK' | 'PENDENTE_CONCILIACAO';
export type FonteComissao = 'HISTORICO_EXATA' | 'PAGAH' | 'ESTIMADA' | 'REDTRACK' | 'REGRA_AFILIADO' | 'AUSENTE';

export interface VendaItem {
  pedido: string;
  grupo: GrupoReceita;
  tipoVenda: 'FRONT' | 'UPSELL' | 'DOWNSELL' | 'CALL_CENTER' | 'OUTRO';
  status: StatusVenda;
  kitNome: string | null;
  metodoPagamento: string | null;
  parcelas: number | null;
  valorTotalCentavos: number | null;
  valorVendaCentavos: number;
  jurosCentavos: number | null;
  comissaoCentavos: number | null;
  comissaoFonte: FonteComissao;
  comissaoAfiliadoCentavos: number | null;
  comissaoAfiliadoFonte: FonteComissao;
  taxaCallCenterCentavos: number | null;
  x1: boolean;
  comissaoX1Oculta?: boolean;
  origem: string | null;
  tipoAtendimento: string | null;
  atendente: string | null;
  campanha: string | null;
  anuncio: string | null;
  pagoEm: string | null;
  estornadoEm: string | null;
  chargebackEm: string | null;
  perdaCentavos: number;
  perdaTipo: 'ESTORNO' | 'CHARGEBACK' | null;
  perdaEm: string | null;
  avisos: string[];
  fonteVerdade: 'HISTORICO' | 'EVENTOS' | 'REDTRACK';
  loja: string | null;
  afiliado: { id: string; nome: string } | null;
}

// ── Front ──────────────────────────────────────────────────

export interface FrontResumo extends MetricasFormatadas {
  porTipo: { compras: MetricasFormatadas; upsells: MetricasFormatadas; downsells: MetricasFormatadas };
  conversaoUpsell: { pedidosUpsell: number; pedidosCompra: number; conversaoUpsellPercentual: number | null };
  unidades: { disponivel: boolean; motivo?: string };
}

export interface ConversaoUpsell {
  geral: { pedidosUpsell: number; pedidosCompra: number; conversaoUpsellPercentual: number | null };
  porLoja: { loja: string | null; pedidosUpsell: number; pedidosCompra: number; conversaoUpsellPercentual: number | null }[];
}

// ── Back-end ───────────────────────────────────────────────

export interface BackendTotal {
  backendOutros: MetricasFormatadas;
  callCenter: MetricasFormatadas;
  recuperacao: MetricasFormatadas;
  backendTotal: MetricasFormatadas;
  composicao: string;
}
export type CanalRow = MetricasFormatadas & { canal: string };

// ── Call Center ────────────────────────────────────────────

export interface CustoCategoria {
  categoriaId: string | null;
  categoria: string;
  totalCentavos: number;
}

export type CallCenterResumo = ResumoComAlertas & {
  unidades: { disponivel: boolean; motivo?: string };
} & (
    | { custos: { restrito: true; motivo: string } }
    | {
        sobraOperacionalEstimadaCentavos: number | null;
        margemPercentual: number | null;
        custosCentavos: number;
        custosPorCategoria: CustoCategoria[];
        metodologiaCustos: string;
        observacaoSobra: string;
      }
  );

export interface CallCenterCustos {
  totalCentavos: number;
  porCategoria: CustoCategoria[];
  regrasIndisponiveis: { regraId: string; nome: string; motivo: string }[];
  metodologia: string;
}

export interface CallCenterComissoes {
  comissaoCentavos: number;
  comissaoEstimadaCentavos: number;
  taxaCallCenterCentavos: number;
  pedidosSemComissao: number;
  observacao: string;
}

export type RecuperacaoRow = MetricasFormatadas & { categoria: 'PIX' | 'BOLETO' | 'ABANDONO' | 'OUTROS' | 'NAO_INFORMADO' };

// ── Afiliados ──────────────────────────────────────────────

export interface AfiliadoItem {
  id: string;
  nome: string;
  pedidos: number;
  faturamentoCentavos: number;
  receitaLiquidaCentavos: number;
  /** comissão do afiliado */
  comissaoCentavos: number;
  /** comissão da operação (Impera) nos pedidos do afiliado */
  comissaoOperacaoCentavos: number;
  reembolsosCentavos: number;
  ticketMedioCentavos: number;
}
export type AfiliadoRanking = AfiliadoItem & { posicao: number };

export interface AfiliadoResumo extends MetricasFormatadas {
  afiliadosAtivos: number;
}

export interface AfiliadoCadastro {
  id: string;
  nome: string;
  criadoEm: string;
  _count: { aliases: number; regras: number; vendas: number };
}

export interface AfiliadoComissoes {
  comissaoAfiliadoCentavos: number;
  comissaoOperacaoCentavos: number;
  porFonteDaComissaoDoAfiliado: { fonte: FonteComissao; pedidos: number; comissaoCentavos: number }[];
}

export interface AfiliadoAlias {
  id: string;
  alias: string;
  criadoEm: string;
}

export interface RegraComissaoAfiliado {
  id: string;
  valorFixoCentavos: number | null;
  percentualBps: number | null;
  vigenteDe: string;
  vigenteAte: string | null;
  fonte: string;
  observacao: string | null;
  criadoEm: string;
}

// ── Reembolsos / RedTrack / Campanhas ──────────────────────

export interface ReembolsosResumo extends MetricasFormatadas {
  perdaTotalCentavos: number;
  pedidosComEstornoEChargeback: number;
  perdasSemData: number;
  limitacoes: string[];
}

export interface RedtrackConversao {
  pedido: string;
  conversaoId: string | null;
  payoutCentavos: number | null;
  situacao: string | null;
  campanha: string | null;
  anuncio: string | null;
  vendaId: string | null;
  sincronizadoEm: string;
}

export interface RedtrackConciliacao {
  vendasNoPeriodo: number;
  vendasComRedtrack: number;
  vendasSemRedtrack: number;
  coberturaPercentual: number | null;
  conversoesSemVenda: number;
  porSituacao: { situacao: string | null; quantidade: number }[];
  observacao: string;
}

export interface RedtrackDivergencia {
  pedido: string;
  tipo: 'SEM_VENDA' | 'PAYOUT_DIFERENTE_DA_COMISSAO';
  payoutCentavos: number | null;
  comissaoCentavos: number | null;
  situacao: string | null;
}

export interface CampanhasResumo extends MetricasFormatadas {
  vendasComCampanha: number;
  vendasSemCampanha: number;
}

// ── Custos ─────────────────────────────────────────────────

export type StatusPagamentoCusto = 'PENDENTE' | 'PAGO' | 'CANCELADO';
export type Periodicidade = 'SEMANAL' | 'MENSAL' | 'TRIMESTRAL' | 'ANUAL';

export interface CategoriaCusto {
  id: string;
  nome: string;
  ativa: boolean;
}

export interface RecorrenciaCusto {
  id: string;
  periodicidade: Periodicidade;
  inicio: string;
  fim: string | null;
}

export interface Custo {
  id: string;
  descricao: string;
  tipo: 'FIXO' | 'VARIAVEL' | string;
  grupo: GrupoReceita | null;
  valorCentavos: number;
  vencimento: string;
  statusPagamento: StatusPagamentoCusto;
  observacao: string | null;
  criadoEm: string;
  atualizadoEm: string;
  categoria: { id: string; nome: string };
  recorrencia: RecorrenciaCusto | null;
  responsavel: { id: string; nome: string } | null;
  _count: { anexos: number };
}

export interface CustosResumo {
  totalLancamentosCentavos: number;
  porCategoria: CustoCategoria[];
  porGrupo: { grupo: string; totalCentavos: number }[];
  ocorrencias: number;
  projetadas: number;
  pagoCentavos: number;
  pendenteCentavos: number;
  metodologia: string;
}

export interface AnexoCusto {
  id: string;
  nomeOriginal: string;
  mime: string;
  tamanhoBytes: number;
  criadoEm: string;
}

// ── Integração / Admin ─────────────────────────────────────

export interface FonteStatus {
  fonte: 'HISTORICO' | 'EVENTOS' | 'REDTRACK';
  estado: string;
  ultimoSucessoEm: string | null;
  ultimaLeituraEm: string | null;
  intervaloSegundos: number;
  ultimoErro?: string | null;
}

export interface IntegracaoStatus {
  estado: 'ATUALIZADO' | 'DESATUALIZADO' | 'ERRO' | 'NUNCA_SINCRONIZADO';
  dadosDesatualizados: boolean;
  ultimaSincronizacao: string | null;
  sincronizandoAgora: { fonte: string; desde: string } | null;
  limiteDesatualizadoSegundos: number;
  /** sincronização automática dentro da API (a cada N minutos); a manual continua disponível */
  sincronizacaoAutomatica?: {
    ativa: boolean;
    intervaloMinutos: number;
    proximaEm: string | null;
    ultimaTentativaEm: string | null;
    ultimoResultado: 'SUCESSO' | 'ERRO' | 'OCUPADO' | null;
  };
  fontes: FonteStatus[];
}

export interface Execucao {
  id: string;
  fonte: 'HISTORICO' | 'EVENTOS' | 'REDTRACK';
  modo: string;
  status: 'EXECUTANDO' | 'SUCESSO' | 'PARCIAL' | 'FALHA';
  iniciadaEm: string;
  finalizadaEm: string | null;
  duracaoMs: number | null;
  lidos: number;
  inseridos: number;
  atualizados: number;
  ignorados: number;
  comErro: number;
  erro: string | null;
  disparadaPor: string;
}

export interface ErroImportacao {
  id: string;
  fonte: string;
  linhaOrigem: number | null;
  codigo: string;
  campo: string | null;
  mensagem: string;
  criadoEm: string;
  sincronizacaoId: string | null;
}

export interface FonteDetalhe {
  fonte: string;
  aba: string;
  estado: string;
  intervaloSegundos: number;
  ultimoSucessoEm: string | null;
  cabecalhosReconhecidos: string[] | null;
  cabecalhosOpcionaisAusentes: string[] | null;
  cursorUltimaLinha: number;
}

export interface RegraClassificacao {
  id: string;
  nome: string;
  campo: string;
  operador: string;
  valor: string;
  grupo: GrupoReceita;
  canal: string | null;
  prioridade: number;
  ativa: boolean;
  versao: number;
}

export interface Pendencias {
  totalPendentes: number;
  agrupamentos: { tipoBruto: string | null; origem: string | null; tipoAtendimento: string | null; pedidos: number; valorVendaCentavos: number }[];
  orientacao: string;
}

export interface AuditoriaItem {
  id: string;
  acao: string;
  entidade: string | null;
  entidadeId: string | null;
  detalhes: unknown;
  ip: string | null;
  criadoEm: string;
  usuario: { id: string; nome: string; email: string } | null;
}

export interface RegraCusto {
  id: string;
  nome: string;
  tipo: 'PERCENTUAL_RECEITA' | 'VALOR_POR_PEDIDO' | 'VALOR_POR_UNIDADE' | 'VALOR_FIXO_PERIODO';
  grupo: GrupoReceita | null;
  categoriaId: string | null;
  valorCentavos: number | null;
  percentualBps: number | null;
  vigenteDe: string;
  vigenteAte: string | null;
  metodologia: string;
  ativa: boolean;
}
