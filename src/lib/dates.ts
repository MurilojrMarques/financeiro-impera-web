import { formatDistanceStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ComparePreset, DateRange, PeriodPreset } from '@/types/filters.types';

/** Fuso de negócio. Todas as datas de filtro são AAAA-MM-DD interpretadas em America/Sao_Paulo (como no backend). */
export const BUSINESS_TZ = 'America/Sao_Paulo';

const ymdFmt = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BUSINESS_TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const pad = (n: number) => String(n).padStart(2, '0');
const toUtc = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const fromUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(s: string | null | undefined): s is string {
  if (!s || !YMD_RE.test(s)) return false;
  return fromUtc(toUtc(s)) === s;
}

/** Hoje no fuso de Brasília (não no fuso do navegador). */
export function todaySP(now: Date = new Date()): string {
  return ymdFmt.format(now);
}

export function addDays(ymd: string, n: number): string {
  const d = toUtc(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

export function addMonths(ymd: string, n: number): string {
  const [y, m, day] = ymd.split('-').map(Number);
  const alvo = new Date(Date.UTC(y, m - 1 + n, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(day, ultimo));
  return fromUtc(alvo);
}

export function diffDaysInclusive(range: DateRange): number {
  return Math.round((toUtc(range.ate).getTime() - toUtc(range.de).getTime()) / 86_400_000) + 1;
}

export function startOfMonth(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function endOfMonth(ymd: string): string {
  const [y, m] = ymd.split('-').map(Number);
  return fromUtc(new Date(Date.UTC(y, m, 0)));
}

export function rangeForPreset(preset: Exclude<PeriodPreset, 'personalizado'>, today: string = todaySP()): DateRange {
  switch (preset) {
    case 'hoje':
      return { de: today, ate: today };
    case 'ontem': {
      const y = addDays(today, -1);
      return { de: y, ate: y };
    }
    case '7d':
      return { de: addDays(today, -6), ate: today };
    case '15d':
      return { de: addDays(today, -14), ate: today };
    case '30d':
      return { de: addDays(today, -29), ate: today };
    case 'mes-atual':
      return { de: startOfMonth(today), ate: today };
    case 'mes-anterior': {
      const prev = addMonths(startOfMonth(today), -1);
      return { de: prev, ate: endOfMonth(prev) };
    }
  }
}

/** Período anterior de MESMA duração, imediatamente antes de `range` (mesma regra do backend). */
export function previousPeriod(range: DateRange): DateRange {
  const n = diffDaysInclusive(range);
  return { de: addDays(range.de, -n), ate: addDays(range.de, -1) };
}

export function comparisonRange(preset: ComparePreset, range: DateRange, custom?: DateRange): DateRange | null {
  switch (preset) {
    case 'nenhuma':
      return null;
    case 'periodo-anterior':
      return previousPeriod(range);
    case 'mes-anterior':
      return { de: addMonths(range.de, -1), ate: addMonths(range.ate, -1) };
    case 'personalizado':
      return custom && isValidYmd(custom.de) && isValidYmd(custom.ate) && custom.de <= custom.ate ? custom : null;
  }
}

/** "2026-10-01" -> "01/10/2026" (sem passar por Date: sem risco de fuso). */
export function formatDate(ymd: string | null | undefined): string {
  if (!ymd) return '—';
  const [y, m, d] = ymd.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '—';
}

/** "01/10 a 18/10/2026" para subtítulos. */
export function formatRange(range: DateRange): string {
  if (range.de === range.ate) return formatDate(range.de);
  const [yd, md, dd] = range.de.split('-');
  const [ya] = range.ate.split('-');
  const inicio = yd === ya ? `${dd}/${md}` : formatDate(range.de);
  return `${inicio} a ${formatDate(range.ate)}`;
}

/** Instante ISO (UTC) -> "20/10/2026 14:05" no fuso de Brasília. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d).replace(',', '');
}

/** "há 4 minutos". */
export function formatRelativeSyncTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'nunca';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'nunca';
  if (now.getTime() - d.getTime() < 45_000) return 'agora há pouco';
  return formatDistanceStrict(d, now, { locale: ptBR, addSuffix: true });
}

export function secondsSince(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.max(0, Math.round((now.getTime() - t) / 1000));
}

/** AAAA-MM-DD -> Date local (meia-noite local) para o calendário: o dia exibido é o dia do calendário, sem deslocar fuso. */
export function ymdToLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date do calendário (dia local) -> AAAA-MM-DD. */
export function localDateToYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
