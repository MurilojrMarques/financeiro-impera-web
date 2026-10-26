import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/lib/env';
import type { Params } from '@/lib/query-keys';
import {
  ApiError,
  errorEnvelopeSchema,
  successEnvelopeSchema,
  type ApiMeta,
  type PagedResult,
  type PageMeta,
  type Result,
} from '@/types/api.types';
import type { AuthPayload } from '@/types/auth.types';

/* ───────────── Access Token: SOMENTE em memória (nunca localStorage/sessionStorage) ───────────── */

type Listener = () => void;
let accessToken: string | null = null;
const listeners = new Set<Listener>();

export const tokenStore = {
  get: (): string | null => accessToken,
  set(token: string | null): void {
    accessToken = token;
    listeners.forEach((l) => l());
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/* ───────────── Eventos de sessão (o AuthProvider reage; o cliente HTTP não conhece React) ───────────── */

type SessionEvent = 'expired' | 'password-change-required';
const sessionListeners = new Set<(e: SessionEvent) => void>();
export const onSessionEvent = (cb: (e: SessionEvent) => void): (() => void) => {
  sessionListeners.add(cb);
  return () => sessionListeners.delete(cb);
};
const emit = (e: SessionEvent) => sessionListeners.forEach((cb) => cb(e));

/* ───────────── Instância Axios ───────────── */

/**
 * CSRF (double-submit): o cookie `csrf` é legível quando o backend o emite com path visível ao documento;
 * se não for legível, o header é omitido e o backend decide (ver docs/BACKEND-GAPS.md, item 1).
 */
function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function createHttp(baseURL: string = env.apiBaseUrl, timeout: number = env.apiTimeoutMs): AxiosInstance {
  return axios.create({
    baseURL,
    timeout,
    withCredentials: true, // cookie HttpOnly do refresh token
    headers: { 'X-Requested-With': 'financeiro-web' },
    paramsSerializer: { serialize: serializeParams },
  });
}

function serializeParams(params: Params): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined || v === null || v === '') continue;
    usp.append(k, String(v));
  }
  return usp.toString();
}

export const http = createHttp();
const raw = createHttp(); // sem interceptores: usado só pelo refresh (evita recursão)

function withCsrf(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const csrf = readCsrfCookie();
  if (csrf) config.headers.set('X-CSRF-Token', csrf);
  return config;
}

raw.interceptors.request.use(withCsrf);

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return withCsrf(config);
});

/* ───────────── Refresh de sessão: UMA requisição por vez (single-flight) ───────────── */

let refreshInFlight: Promise<AuthPayload | null> | null = null;

export function refreshSession(): Promise<AuthPayload | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await raw.post('/auth/refresh', {});
      const parsed = successEnvelopeSchema.safeParse(res.data);
      if (!parsed.success) throw new Error('resposta inválida');
      const payload = parsed.data.data as AuthPayload;
      tokenStore.set(payload.accessToken);
      return payload;
    } catch {
      tokenStore.set(null);
      return null;
    } finally {
      // libera na próxima volta do event loop: chamadas simultâneas já receberam a mesma promise
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();
  return refreshInFlight;
}

const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout'];

http.interceptors.response.use(
  (r) => r,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && error.config) {
      const cfg = error.config as AxiosRequestConfig & { _retry?: boolean };
      const url = cfg.url ?? '';
      if (!cfg._retry && !NO_REFRESH.some((p) => url.startsWith(p))) {
        cfg._retry = true;
        const renewed = await refreshSession();
        if (renewed) return http.request(cfg);
        emit('expired');
      }
    }
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const parsed = errorEnvelopeSchema.safeParse(error.response.data);
      if (parsed.success && parsed.data.error.code === 'PASSWORD_CHANGE_REQUIRED') emit('password-change-required');
    }
    return Promise.reject(error);
  },
);

/* ───────────── Normalização de erros ───────────── */

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isCancel(err)) return new ApiError('Requisição cancelada', 'canceled');
  if (err instanceof AxiosError) {
    if (err.code === 'ERR_CANCELED') return new ApiError('Requisição cancelada', 'canceled');
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return new ApiError('A API demorou demais para responder.', 'timeout');
    }
    if (!err.response) return new ApiError('Não foi possível conectar à API.', 'network');
    const status = err.response.status;
    const parsed = errorEnvelopeSchema.safeParse(err.response.data);
    if (parsed.success) {
      const e = parsed.data.error;
      return new ApiError(e.message, 'http', status, e.code, e.details ?? null);
    }
    return new ApiError(messageForStatus(status), 'http', status, null, null);
  }
  return new ApiError('Erro inesperado.', 'invalid-response');
}

/** Mensagens que não expõem detalhes de infraestrutura. */
export function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Requisição inválida.';
    case 401:
      return 'Sessão expirada. Entre novamente.';
    case 403:
      return 'Você não tem permissão para esta ação.';
    case 404:
      return 'Recurso não encontrado.';
    case 409:
      return 'Conflito: a operação não pôde ser concluída.';
    case 422:
      return 'Dados inválidos.';
    case 429:
      return 'Muitas requisições. Aguarde um instante e tente novamente.';
    case 503:
      return 'Serviço temporariamente indisponível.';
    default:
      return status >= 500 ? 'Erro interno do servidor.' : 'Não foi possível concluir a operação.';
  }
}

/* ───────────── Chamadas tipadas (envelope validado) ───────────── */

interface CallOptions {
  params?: Params;
  signal?: AbortSignal;
}

function unwrap<T>(body: unknown): Result<T> {
  const parsed = successEnvelopeSchema.safeParse(body);
  if (!parsed.success) throw new ApiError('A API retornou uma resposta fora do contrato esperado.', 'invalid-response');
  if (parsed.data.data === undefined) throw new ApiError('A API retornou uma resposta sem dados.', 'invalid-response');
  return { data: parsed.data.data as T, meta: (parsed.data.meta ?? {}) as ApiMeta };
}

async function run<T>(fn: () => Promise<{ data: unknown }>): Promise<Result<T>> {
  try {
    const res = await fn();
    return unwrap<T>(res.data);
  } catch (e) {
    throw toApiError(e);
  }
}

export const apiGet = <T>(path: string, { params, signal }: CallOptions = {}): Promise<Result<T>> =>
  run<T>(() => http.get(path, { params, signal }));

export async function apiGetPaged<T>(path: string, opts: CallOptions = {}): Promise<PagedResult<T>> {
  const { data, meta } = await apiGet<T[]>(path, opts);
  if (!Array.isArray(data)) throw new ApiError('Resposta paginada inválida.', 'invalid-response');
  const m = meta as Partial<PageMeta>;
  if (typeof m.page !== 'number' || typeof m.total !== 'number') {
    throw new ApiError('Resposta paginada sem metadados.', 'invalid-response');
  }
  return { data, meta: m as PageMeta };
}

export const apiPost = <T>(path: string, body?: unknown, signal?: AbortSignal): Promise<Result<T>> =>
  run<T>(() => http.post(path, body ?? {}, { signal }));

export const apiPatch = <T>(path: string, body?: unknown, signal?: AbortSignal): Promise<Result<T>> =>
  run<T>(() => http.patch(path, body ?? {}, { signal }));

export const apiPut = <T>(path: string, body?: unknown, signal?: AbortSignal): Promise<Result<T>> =>
  run<T>(() => http.put(path, body ?? {}, { signal }));

/** DELETE e rotas 204: sem corpo. */
export async function apiDelete(path: string, signal?: AbortSignal): Promise<void> {
  try {
    await http.delete(path, { signal });
  } catch (e) {
    throw toApiError(e);
  }
}

export async function apiNoContent(method: 'post' | 'patch', path: string, body?: unknown): Promise<void> {
  try {
    await http.request({ method, url: path, data: body ?? {} });
  } catch (e) {
    throw toApiError(e);
  }
}

export async function apiUpload<T>(path: string, field: string, file: File, signal?: AbortSignal): Promise<Result<T>> {
  const form = new FormData();
  form.append(field, file);
  return run<T>(() => http.post(path, form, { signal, headers: { 'Content-Type': 'multipart/form-data' } }));
}

/** Upload com campos extras (multipart): `campos` vão como texto junto do arquivo. */
export async function apiUploadForm<T>(path: string, field: string, file: File, campos: Record<string, string | number | undefined> = {}, signal?: AbortSignal): Promise<Result<T>> {
  const form = new FormData();
  for (const [k, v] of Object.entries(campos)) if (v !== undefined && v !== '') form.append(k, String(v));
  form.append(field, file); // o arquivo por último: os campos já estão disponíveis quando o servidor lê o arquivo
  return run<T>(() => http.post(path, form, { signal, headers: { 'Content-Type': 'multipart/form-data' } }));
}

export async function apiDownload(path: string): Promise<Blob> {
  try {
    const res = await http.get(path, { responseType: 'blob' });
    return res.data as Blob;
  } catch (e) {
    throw toApiError(e);
  }
}
