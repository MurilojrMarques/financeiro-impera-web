import type { CriterioFinanceiro } from './api.types';

export type PeriodPreset =
  | 'hoje'
  | 'ontem'
  | '7d'
  | '15d'
  | '30d'
  | 'mes-atual'
  | 'mes-anterior'
  | 'personalizado';

export type ComparePreset = 'nenhuma' | 'periodo-anterior' | 'mes-anterior' | 'personalizado';

export interface DateRange {
  de: string; // AAAA-MM-DD (America/Sao_Paulo)
  ate: string;
}

/** Filtros globais. Vivem na URL (compartilháveis) e são traduzidos para os parâmetros da API em um único lugar. */
export interface FilterState {
  periodo: PeriodPreset;
  de: string;
  ate: string;
  comparar: ComparePreset;
  compDe: string;
  compAte: string;
  modo: CriterioFinanceiro;
  loja?: string;
  produto?: string;
  status?: string;
  metodo?: string;
  origem?: string;
  grupo?: string;
  afiliadoId?: string;
  atendente?: string;
  campanha?: string;
  tipo?: string;
}

/** Quais filtros adicionais cada página exibe. */
export type ExtraFilterKey = 'loja' | 'produto' | 'status' | 'metodo' | 'origem' | 'grupo' | 'afiliadoId' | 'atendente' | 'campanha' | 'tipo';
