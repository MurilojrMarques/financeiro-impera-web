import type { Perfil } from '@/types/auth.types';

/**
 * ADMIN > FINANCEIRO > ANALISTA > LEITURA (espelha os grupos de perfis do backend).
 * A UI só OCULTA o que o perfil não pode usar; a autoridade final é sempre o backend (403).
 */
const RANK: Record<Perfil, number> = { LEITURA: 0, ANALISTA: 1, FINANCEIRO: 2, ADMIN: 3 };

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
