import type { Perfil, RhPapel } from '@/types/auth.types';

/**
 * ADMIN > FINANCEIRO > ANALISTA > LEITURA (espelha os grupos de perfis do backend).
 * A UI só OCULTA o que o perfil não pode usar; a autoridade final é sempre o backend (403).
 */
const RANK: Record<Perfil, number> = { SEM_FINANCEIRO: -1, LEITURA: 0, ANALISTA: 1, FINANCEIRO: 2, ADMIN: 3 };

export type Area =
  | 'dashboard'
  | 'front'
  | 'backend'
  | 'call-center'
  | 'afiliados'
  | 'reembolsos'
  | 'campanhas'
  | 'trafego'
  | 'recuperacao'
  | 'comissoes'
  | 'custos'
  | 'integracoes'
  | 'configuracoes';

const AREA_MIN: Record<Area, Perfil> = {
  dashboard: 'LEITURA',
  front: 'ANALISTA',
  backend: 'ANALISTA',
  'call-center': 'ANALISTA',
  afiliados: 'ANALISTA',
  reembolsos: 'ANALISTA',
  campanhas: 'ANALISTA',
  trafego: 'ANALISTA',
  recuperacao: 'ANALISTA',
  comissoes: 'ANALISTA',
  custos: 'FINANCEIRO',
  integracoes: 'LEITURA',
  configuracoes: 'LEITURA',
};

export type Action =
  | 'custos.write'
  | 'trafego.parametros'
  | 'custos.delete'
  | 'afiliados.admin'
  | 'afiliados.ver-regras'
  | 'integracoes.executar'
  | 'integracoes.detalhes'
  | 'usuarios.admin'
  | 'classificacoes.admin'
  | 'classificacoes.ver'
  | 'call-center.custos'
  | 'financeiro.ver';

const ACTION_MIN: Record<Action, Perfil> = {
  'custos.write': 'FINANCEIRO',
  'trafego.parametros': 'FINANCEIRO',
  'custos.delete': 'FINANCEIRO',
  'afiliados.admin': 'ADMIN',
  'afiliados.ver-regras': 'FINANCEIRO',
  'integracoes.executar': 'ADMIN',
  'integracoes.detalhes': 'ADMIN',
  'usuarios.admin': 'ADMIN',
  'classificacoes.admin': 'ADMIN',
  'classificacoes.ver': 'FINANCEIRO',
  'call-center.custos': 'FINANCEIRO',
  'financeiro.ver': 'FINANCEIRO',
};

export const atLeast = (perfil: Perfil | undefined, min: Perfil): boolean => !!perfil && RANK[perfil] >= RANK[min];
export const canAccess = (perfil: Perfil | undefined, area: Area): boolean => atLeast(perfil, AREA_MIN[area]);
export const can = (perfil: Perfil | undefined, action: Action): boolean => atLeast(perfil, ACTION_MIN[action]);

/** Quem tem alguma tela do financeiro (SEM_FINANCEIRO é só RH). */
export const temFinanceiro = (perfil: Perfil | undefined): boolean => !!perfil && perfil !== 'SEM_FINANCEIRO';

/* ───────────── RH ───────────── */

export type RhArea = 'painel' | 'colaboradores' | 'folha' | 'comissoes' | 'documentos' | 'monitoramento' | 'meu-perfil' | 'conta';

const RH_AREAS: Record<RhPapel, RhArea[]> = {
  RH: ['painel', 'colaboradores', 'folha', 'comissoes', 'documentos', 'monitoramento', 'meu-perfil', 'conta'],
  CEO: ['painel', 'colaboradores', 'folha', 'comissoes', 'documentos', 'monitoramento', 'meu-perfil', 'conta'],
  GESTOR: ['documentos', 'comissoes', 'meu-perfil', 'conta'],
  COLABORADOR: ['documentos', 'meu-perfil', 'conta'],
};

export type RhAction =
  /** vê salários (de todos) */
  | 'salario.ver'
  /** lança comissão/bônus/desconto, paga e fecha a folha */
  | 'folha.editar'
  /** aprova/reprova documentos e envia comprovantes/contratos em nome de qualquer colaborador */
  | 'documentos.revisar'
  /** vincula o copywriter ao colaborador e lança a comissão na folha */
  | 'comissoes.lancar'
  | 'monitoramento.conferir';

const RH_ACTIONS: Record<RhAction, RhPapel[]> = {
  'salario.ver': ['RH', 'CEO'],
  'folha.editar': ['RH'],
  'documentos.revisar': ['RH'],
  'comissoes.lancar': ['RH'],
  'monitoramento.conferir': ['RH', 'CEO'],
};

/** A UI só oculta; o backend decide (RH/CEO veem salários; gestor vê a equipe sem salário; colaborador só o que é seu). */
export const rhArea = (papel: RhPapel | null | undefined, area: RhArea): boolean => !!papel && RH_AREAS[papel].includes(area);
export const rhCan = (papel: RhPapel | null | undefined, action: RhAction): boolean => !!papel && RH_ACTIONS[action].includes(papel);
export const primeiraAreaRh = (papel: RhPapel | null | undefined): RhArea | null => (papel ? RH_AREAS[papel][0]! : null);
