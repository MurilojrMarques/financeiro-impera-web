import { z } from 'zod';

export type CriterioFinanceiro = 'APROVADAS' | 'MOVIMENTACAO';

export interface ApiMeta {
  periodo?: { de: string; ate: string };
  timezone?: string;
  criterioFinanceiro?: CriterioFinanceiro;
  metodologia?: string;
  ultimaSincronizacao?: string | null;
  dadosDesatualizados?: boolean;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

/** Resultado de um serviço: dado + metadados do backend (período, critério, atualidade). */
export interface Result<T> {
  data: T;
  meta: ApiMeta;
}

export interface PageMeta extends ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: PageMeta;
}

/** Envelope validado em tempo de execução: resposta fora do contrato vira erro explícito, nunca dado inventado. */
export const successEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});

export type ApiErrorKind = 'network' | 'timeout' | 'canceled' | 'http' | 'invalid-response';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly kind: ApiErrorKind,
    public readonly status: number | null = null,
    public readonly code: string | null = null,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isUnavailable(): boolean {
    return this.status === 503 || this.kind === 'network';
  }
  /** erros que fazem sentido tentar de novo */
  get isRetryable(): boolean {
    return this.kind === 'network' || this.kind === 'timeout' || this.status === 503 || this.status === 502 || this.status === 504;
  }
}
