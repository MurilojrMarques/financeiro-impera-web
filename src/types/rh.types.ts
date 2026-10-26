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
