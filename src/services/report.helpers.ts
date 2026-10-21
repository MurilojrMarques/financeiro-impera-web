import type { Params } from '@/lib/query-keys';
import { apiGet, apiGetPaged } from './api.client';

/** Fábricas de consulta: (params, signal) => Promise. Evita repetir assinatura em cada serviço. */
export const getter =
  <T>(path: string) =>
  (params?: Params, signal?: AbortSignal) =>
    apiGet<T>(path, { params, signal });

export const pagedGetter =
  <T>(path: string) =>
  (params?: Params, signal?: AbortSignal) =>
    apiGetPaged<T>(path, { params, signal });
