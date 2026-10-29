import type { RhPapel } from './auth.types';

/** Valores em CENTAVOS inteiros. Campos de salário só vêm quando o papel do usuário permite (RH/CEO; o próprio). */
export interface RhColaborador {
  id: string;
  nome: string;
  email: string | null;
  celular: string | null;
  camiseta: string | null;
  departamento: string;
  cargoBase: string | null;
  funcao: string | null;
  tipoCargo: string | null;
  senioridade: string | null;
  subnivel: number | null;
  gestor: { id: string; nome: string } | null;
  gestorId: string | null;
  inicio: string | null;
  demissao: string | null;
  ativo: boolean;
  foto: string | null;
  tamanhoDaEquipe?: number;
  /** só para quem vê dados pessoais (RH/CEO e o próprio) */
  nascimento?: string | null;
  cnpj?: string | null;
  /** chave PIX (não vem do sistema do RH: é mantida aqui pelo RH) */
  pix?: string | null;
  endereco?: string | null;
  motivoDemissao?: string | null;
  discordUserId?: string | null;
  contratoObs?: string | null;
  /** só para quem vê salário */
  salarioCentavos?: number;
}

export interface RhEu {
  papel: RhPapel;
  colaborador: RhColaborador;
}

export type RhTipoMovimentacao = 'PROMOCAO' | 'REAJUSTE';

export interface RhMovimentacao {
  id: string;
  tipo: RhTipoMovimentacao;
  data: string;
  cargoAnterior: string | null;
  cargoNovo: string | null;
  departamentoAnterior: string | null;
  departamentoNovo: string | null;
  senioridadeAnterior: string | null;
  senioridadeNova: string | null;
  salarioAnteriorCentavos: number;
  salarioNovoCentavos: number;
  obs: string | null;
}

export interface RhAgrupamento {
  nome: string;
  quantidade: number;
  folhaCentavos: number;
  mediaCentavos: number;
}

export interface RhPainel {
  ativos: number;
  desligados: number;
  folhaMensalCentavos: number;
  mediaSalarialCentavos: number;
  baseDaFolha: 'SALARIO';
  porDepartamento: RhAgrupamento[];
  porSenioridade: RhAgrupamento[];
  ultimos90Dias: { movimentacoes: number; promocoes: number; reajustes: number; aumentoMensalCentavos: number };
}

export type RhStatusFolha = 'ABERTA' | 'FECHADA';
export type RhStatusPagamento = 'PENDENTE' | 'PAGO';

export interface RhFolhaResumo {
  pessoas: number;
  salariosCentavos: number;
  salariosMensaisCentavos: number;
  comissoesCentavos: number;
  bonusCentavos: number;
  descontosCentavos: number;
  /** ImperaCred (adiantamento do mês anterior) descontado nesta folha */
  imperaCredCentavos: number;
  totalCentavos: number;
  pagoCentavos: number;
  pendenteCentavos: number;
}

export interface RhFolhaListada extends RhFolhaResumo {
  competencia: string;
  status: RhStatusFolha;
  fechadaEm: string | null;
}

export interface RhFolhaItem {
  id: string;
  colaboradorId: string;
  salarioMensalCentavos: number;
  diasTrabalhados: number;
  salarioCentavos: number;
  comissaoCentavos: number;
  bonusCentavos: number;
  descontoCentavos: number;
  /** adiantamento de salário (ImperaCred) do mês anterior, descontado aqui */
  imperaCredCentavos: number;
  totalCentavos: number;
  status: RhStatusPagamento;
  pagoEm: string | null;
  obs: string | null;
  colaborador: { id: string; nome: string; departamento: string; funcao: string | null; cnpj: string | null };
}

export interface RhFolhaDetalhe {
  competencia: string;
  status: RhStatusFolha;
  fechadaEm: string | null;
  resumo: RhFolhaResumo;
  itens: RhFolhaItem[];
}

export interface RhFolhaItemEdicao {
  comissaoCentavos?: number;
  bonusCentavos?: number;
  descontoCentavos?: number;
  obs?: string | null;
  status?: RhStatusPagamento;
  pagoEm?: string | null;
}

export type RhTipoDocumento = 'NOTA_FISCAL' | 'COMPROVANTE_PAGAMENTO' | 'CONTRATO' | 'OUTRO';
export type RhStatusDocumento = 'ENVIADO' | 'APROVADO' | 'REPROVADO';

export interface RhDocumento {
  id: string;
  colaboradorId: string;
  tipo: RhTipoDocumento;
  competencia: string | null;
  valorCentavos: number | null;
  descricao: string | null;
  arquivoNome: string;
  mime: string;
  tamanhoBytes: number;
  status: RhStatusDocumento;
  motivoReprovacao: string | null;
  criadoEm: string;
  colaborador: { nome: string };
}

/** GET /rh/documentos/resumo: situação da nota fiscal de cada colaborador no mês */
export interface RhNotasResumoItem {
  colaboradorId: string;
  nome: string;
  departamento: string | null;
  funcao: string | null;
  nota: { id: string; status: RhStatusDocumento; valorCentavos: number | null; arquivoNome: string; motivoReprovacao: string | null; criadoEm: string } | null;
  quantidadeNotas: number;
  comprovante: boolean;
}
export interface RhNotasResumo {
  competencia: string;
  totais: { colaboradores: number; comNota: number; semNota: number; aprovadas: number; aguardandoRevisao: number; reprovadas: number; valorNotasCentavos: number };
  itens: RhNotasResumoItem[];
}

/** GET /rh/comissoes: comissão do time do Front por pessoa (criativos e VSL pelo MC BR, otimizações, liderança, gestor, editor e fixo) */
export type RhComissaoTipo = 'COPYWRITER' | 'GESTOR' | 'EDITOR' | 'FIXO';
export interface RhComissaoItem {
  /** uuid do copywriter no copy, ou GESTOR:GREG / EDITOR:MINEIRO / FIXO:IAGO */
  chave: string;
  tipo: RhComissaoTipo;
  nome: string;
  /** EM_IMPLEMENTACAO = não bate com a folha ou falta a fonte do dado: não entra no total nem no lançamento */
  status: 'CALCULADA' | 'EM_IMPLEMENTACAO';
  motivo: string | null;
  ativo: boolean;
  regra: string;
  colaborador: { id: string; nome: string } | null;
  mcBrCentavos: number | null;
  criativosCentavos: number | null;
  vslCentavos: number | null;
  otimizacoesCentavos: number | null;
  outrosCentavos: number | null;
  outrosRotulo: string | null;
  apuradaCentavos: number | null;
  aPagarCentavos: number | null;
  naFolhaCentavos: number | null;
}
export interface RhComissaoVsl {
  disponivel: boolean;
  mensagem: string | null;
  semDono: { vsl: string; mcBrCentavos: number }[];
}
export type RhComissoes =
  | { competencia: string; folha: { status: 'ABERTA' | 'FECHADA' } | null; disponivel: false; motivo: string; mensagem: string; itens: []; sugestoes: Record<string, never>; totais: null; vsl: null }
  | {
      competencia: string;
      folha: { status: 'ABERTA' | 'FECHADA' } | null;
      disponivel: true;
      estado: 'FECHADO' | 'PROVISORIO';
      /** false = mês anterior à regra completa (só o 5% dos criativos) */
      completa: boolean;
      itens: RhComissaoItem[];
      sugestoes: Record<string, { id: string; nome: string }[]>;
      vsl: RhComissaoVsl | null;
      totais: { comissaoCentavos: number; aPagarCentavos: number; semVinculo: number; emImplementacao: number } | null;
    };
/** GET /rh/imperacred: adiantamentos de salário feitos em `competencia`, descontados na folha do mês seguinte */
export interface RhImperaCred {
  id: string;
  colaboradorId: string;
  competencia: string;
  valorCentavos: number;
  observacao: string | null;
  criadoEm: string;
  colaborador: { id: string; nome: string; departamento: string };
}
export interface RhImperaCredMes {
  competencia: string;
  descontaEm: string;
  folhaDoDesconto: { status: RhStatusFolha } | null;
  totalCentavos: number;
  itens: RhImperaCred[];
}
export interface RhOtimizacao {
  id: string;
  competencia: string;
  copywriter: string;
  descricao: string;
  valorCentavos: number;
  criadoEm: string;
}

export interface RhDocumentoEnvio {
  tipo: RhTipoDocumento;
  colaboradorId?: string;
  competencia?: string;
  valorCentavos?: number;
  descricao?: string;
}

export type RhTipoAlteracao = 'NOVO_COLABORADOR' | 'SALARIO' | 'CARGO' | 'DEPARTAMENTO' | 'GESTOR' | 'DESLIGAMENTO' | 'MOVIMENTACAO' | 'REMOVIDO_DA_ORIGEM';

export interface RhAlteracao {
  id: string;
  tipo: RhTipoAlteracao;
  campo: string | null;
  /** texto; salário em centavos */
  anterior: string | null;
  novo: string | null;
  detectadaEm: string;
  colaborador: { id: string; nome: string | null } | null;
}

export interface RhMonitoramento {
  monitoramentoLigado: boolean;
  intervaloMinutos: number;
  ultimaVerificacaoEm: string | null;
  ultimoStatus: 'SUCESSO' | 'ERRO' | null;
  ultimoErro: string | null;
  falhasSeguidas: number;
  atrasado: boolean;
  minutosDesdeAUltimaVerificacao: number | null;
  origem: { salvaEm: string | null; salvaPor: string | null };
  ultimaSincronizacao: { id: string; em: string; alteracoes: number; novos: number; atualizados: number } | null;
  inconsistenciasNaOrigem: { colaboradorId: string; salarioAtualCentavos: number; ultimoReajusteCentavos: number }[];
  alteracoesUltimos30Dias: Partial<Record<RhTipoAlteracao, number>>;
}

export type RhResultadoSync =
  | { situacao: 'SEM_MUDANCA' }
  | { situacao: 'OCUPADO' }
  | { situacao: 'SINCRONIZADO'; sincronizacaoId: string; alteracoes: number; inconsistencias: number; folhaRecalculada: number }
  | { situacao: 'ERRO'; erro: string };
