import { useCallback, useMemo } from 'react';
import { useUrlSearchParams } from './useUrlSearchParams';
import { comparisonRange, isValidYmd, rangeForPreset, todaySP } from '@/lib/dates';
import { env } from '@/lib/env';
import type { Params } from '@/lib/query-keys';
import type { ComparePreset, DateRange, ExtraFilterKey, FilterState, PeriodPreset } from '@/types/filters.types';

const PERIODS: PeriodPreset[] = ['hoje', 'ontem', '7d', '15d', '30d', 'mes-atual', 'mes-anterior', 'personalizado'];
const COMPARES: ComparePreset[] = ['nenhuma', 'periodo-anterior', 'mes-anterior', 'personalizado'];
export const EXTRA_KEYS: ExtraFilterKey[] = ['loja', 'produto', 'status', 'metodo', 'origem', 'grupo', 'afiliadoId', 'atendente', 'campanha', 'tipo'];

/** Parâmetros preservados ao navegar entre abas (filtros específicos de uma página não vazam para outras). */
export const SHARED_PARAMS = ['periodo', 'de', 'ate', 'comparar', 'cde', 'cate', 'modo'];

export const DEFAULT_PERIOD: PeriodPreset = 'mes-atual';

/** URL -> estado (valores inválidos caem no padrão: nunca quebram a página com um link malformado). */
export function parseFilters(sp: URLSearchParams, today: string = todaySP()): FilterState {
  const periodoRaw = sp.get('periodo') as PeriodPreset | null;
  let periodo: PeriodPreset = periodoRaw && PERIODS.includes(periodoRaw) ? periodoRaw : DEFAULT_PERIOD;

  const deRaw = sp.get('de');
  const ateRaw = sp.get('ate');
  let de = '';
  let ate = '';
  if (periodo === 'personalizado') {
    if (isValidYmd(deRaw) && isValidYmd(ateRaw) && deRaw <= ateRaw) {
      de = deRaw;
      ate = ateRaw;
    } else {
      periodo = DEFAULT_PERIOD;
    }
  }
  if (periodo !== 'personalizado') ({ de, ate } = rangeForPreset(periodo, today));

  const compararRaw = sp.get('comparar') as ComparePreset | null;
  const comparar: ComparePreset = compararRaw && COMPARES.includes(compararRaw) ? compararRaw : 'nenhuma';
  const cde = sp.get('cde');
  const cate = sp.get('cate');
  const modoRaw = sp.get('modo');

  const state: FilterState = {
    periodo, de, ate, comparar,
    compDe: isValidYmd(cde) ? cde : '',
    compAte: isValidYmd(cate) ? cate : '',
    modo: modoRaw === 'APROVADAS' || modoRaw === 'MOVIMENTACAO' ? modoRaw : env.defaultCriterio,
  };
  for (const k of EXTRA_KEYS) {
    const v = sp.get(k);
    if (v) state[k] = v.slice(0, 200);
  }
  return state;
}

/** estado -> URL (omite padrões para manter links curtos). */
export function serializeFilters(f: FilterState): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.periodo !== DEFAULT_PERIOD) sp.set('periodo', f.periodo);
  if (f.periodo === 'personalizado') {
    sp.set('de', f.de);
    sp.set('ate', f.ate);
  }
  if (f.comparar !== 'nenhuma') sp.set('comparar', f.comparar);
  if (f.comparar === 'personalizado' && f.compDe && f.compAte) {
    sp.set('cde', f.compDe);
    sp.set('cate', f.compAte);
  }
  if (f.modo !== env.defaultCriterio) sp.set('modo', f.modo);
  for (const k of EXTRA_KEYS) if (f[k]) sp.set(k, f[k] as string);
  return sp;
}

/** Único lugar que traduz filtros de UI em parâmetros da API. */
export function toApiParams(f: FilterState, keys: readonly ExtraFilterKey[] = EXTRA_KEYS, rangeOverride?: DateRange): Params {
  const range = rangeOverride ?? { de: f.de, ate: f.ate };
  const params: Params = { de: range.de, ate: range.ate, modo: f.modo };
  for (const k of keys) if (f[k]) params[k] = f[k];
  return params;
}

export function useFilters() {
  const { sp, update } = useUrlSearchParams();
  const today = todaySP();
  const filters = useMemo(() => parseFilters(sp, today), [sp, today]);

  const range = useMemo<DateRange>(() => ({ de: filters.de, ate: filters.ate }), [filters.de, filters.ate]);
  const compareRange = useMemo(
    () => comparisonRange(filters.comparar, range, { de: filters.compDe, ate: filters.compAte }),
    [filters.comparar, filters.compDe, filters.compAte, range],
  );

  const setFilters = useCallback(
    (patch: Partial<FilterState>) => {
      update((prev) => serializeFilters({ ...parseFilters(prev, todaySP()), ...patch }));
    },
    [update],
  );

  const clearExtra = useCallback(() => {
    update((prev) => {
      const next = parseFilters(prev, todaySP());
      for (const k of EXTRA_KEYS) delete next[k];
      return serializeFilters(next);
    });
  }, [update]);

  const resetAll = useCallback(() => update(() => new URLSearchParams()), [update]);

  const isDefault = sp.toString() === '' || serializeFilters(filters).toString() === '';

  const activeExtraCount = EXTRA_KEYS.filter((k) => !!filters[k]).length;

  const apiParams = useCallback((keys?: readonly ExtraFilterKey[], rangeOverride?: DateRange) => toApiParams(filters, keys, rangeOverride), [filters]);

  return { filters, range, compareRange, setFilters, clearExtra, resetAll, isDefault, activeExtraCount, apiParams };
}
