/** Chaves do TanStack Query: sempre [domínio, recurso, parâmetros] — filtros fazem parte da chave (cache por consulta). */
export type Params = Record<string, string | number | boolean | undefined | null>;

export const qk = {
  auth: { me: ['auth', 'me'] as const, sessions: ['auth', 'sessions'] as const },
  report: (domain: string, resource: string, params?: Params) => [domain, resource, params ?? {}] as const,
  domain: (domain: string) => [domain] as const,
  integracaoStatus: ['integracoes', 'status'] as const,
} as const;
