const intFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function formatInteger(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? '—' : intFmt.format(n);
}

/** 12.345 -> "12,35%". Sem valor => "—". */
export function formatPercentage(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)}%`;
}

/** Variação percentual com sinal: "+12,5%" / "−35,7%". */
export function formatSignedPercentage(n: number, digits = 1): string {
  const abs = formatPercentage(Math.abs(n), digits);
  return n > 0 ? `+${abs}` : n < 0 ? `−${abs}` : abs;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

const GRUPO_LABEL: Record<string, string> = {
  FRONT: 'Front',
  BACKEND_OUTROS: 'Back-end Outros',
  CALL_CENTER: 'Call Center',
  RECUPERACAO: 'Recuperação de vendas',
  AFILIADO: 'Afiliados',
  NAO_CLASSIFICADA: 'Não classificadas',
};
export const grupoLabel = (g: string): string => GRUPO_LABEL[g] ?? g;

const STATUS_LABEL: Record<string, string> = {
  PAGO: 'Pago',
  ESTORNADO: 'Estornado',
  CHARGEBACK: 'Chargeback',
  PENDENTE_CONCILIACAO: 'Pendente de conciliação',
};
export const statusLabel = (s: string): string => STATUS_LABEL[s] ?? s;

const TIPO_VENDA_LABEL: Record<string, string> = { FRONT: 'Compra', UPSELL: 'Upsell', DOWNSELL: 'Downsell', CALL_CENTER: 'Call Center', OUTRO: 'Outro' };
export const tipoVendaLabel = (t: string): string => TIPO_VENDA_LABEL[t] ?? t;

const FONTE_COMISSAO_LABEL: Record<string, string> = {
  HISTORICO_EXATA: 'Exata (histórico)',
  PAGAH: 'Pagah',
  REDTRACK: 'RedTrack (payout)',
  REGRA_AFILIADO: 'Regra (estimada)',
  ESTIMADA: 'Estimada',
  AUSENTE: 'Não informada',
};
export const fonteComissaoLabel = (f: string): string => FONTE_COMISSAO_LABEL[f] ?? f;

/** Chave de dimensão nula = valor não informado na origem (≠ zero). */
export const dimLabel = (chave: string | null | undefined): string => (chave === null || chave === undefined || chave === '' ? 'Não informado' : chave);

export const PERIODICIDADE_LABEL: Record<string, string> = {
  UNICO: 'Único',
  SEMANAL: 'Semanal',
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  ANUAL: 'Anual',
};
