import { z } from 'zod';

const schema = z.object({
  // URL absoluta (ex.: http://localhost:3000/api/v1) ou caminho relativo (/api/v1) quando a hospedagem repassa /api para a API
  VITE_API_BASE_URL: z
    .string()
    .refine((v) => /^\/[^/]/.test(v) || z.string().url().safeParse(v).success, 'use uma URL completa ou um caminho começando com "/" (ex.: /api/v1)')
    .default('http://localhost:3000/api/v1'),
  VITE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  VITE_REFRESH_KPI_MS: z.coerce.number().int().min(0).default(0),
  VITE_REFRESH_STATUS_MS: z.coerce.number().int().min(0).default(30_000),
  VITE_DEFAULT_CRITERIO: z.enum(['MOVIMENTACAO', 'APROVADAS']).default('MOVIMENTACAO'),
  VITE_STALE_AFTER_SECONDS: z.coerce.number().int().positive().default(300),
});

export type AppEnv = {
  apiBaseUrl: string;
  apiTimeoutMs: number;
  refreshKpiMs: number;
  refreshStatusMs: number;
  defaultCriterio: 'MOVIMENTACAO' | 'APROVADAS';
  staleAfterSeconds: number;
};

export function parseEnv(source: Record<string, unknown>): AppEnv {
  // string vazia = não definida
  const limpo = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== '' && v !== undefined));
  const r = schema.safeParse(limpo);
  if (!r.success) {
    throw new Error(`Configuração inválida (.env): ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  const e = r.data;
  return {
    apiBaseUrl: e.VITE_API_BASE_URL.replace(/\/+$/, ''),
    apiTimeoutMs: e.VITE_API_TIMEOUT_MS,
    refreshKpiMs: e.VITE_REFRESH_KPI_MS,
    refreshStatusMs: e.VITE_REFRESH_STATUS_MS,
    defaultCriterio: e.VITE_DEFAULT_CRITERIO,
    staleAfterSeconds: e.VITE_STALE_AFTER_SECONDS,
  };
}

export const env: AppEnv = parseEnv(import.meta.env as Record<string, unknown>);
