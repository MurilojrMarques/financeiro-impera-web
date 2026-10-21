import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiGetPaged, onSessionEvent, tokenStore } from '@/services/api.client';
import { ApiError } from '@/types/api.types';

const BASE = 'http://localhost:3000/api/v1';
const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => tokenStore.set(null));

const ok = (data: unknown, meta?: unknown) => HttpResponse.json({ success: true, data, meta });
const fail = (status: number, code: string, message = 'x') => HttpResponse.json({ success: false, error: { code, message, requestId: 'r1' } }, { status });

describe('cliente HTTP', () => {
  it('desembrulha o envelope e envia Bearer do token em memória', async () => {
    let auth: string | null = null;
    server.use(mswHttp.get(`${BASE}/ping`, ({ request }) => { auth = request.headers.get('authorization'); return ok({ a: 1 }); }));
    tokenStore.set('tok');
    const r = await apiGet<{ a: number }>('/ping');
    expect(r.data).toEqual({ a: 1 });
    expect(auth).toBe('Bearer tok');
  });

  it('descarta parâmetros vazios', async () => {
    let url = '';
    server.use(mswHttp.get(`${BASE}/q`, ({ request }) => { url = request.url; return ok([]); }));
    await apiGet('/q', { params: { a: 'x', b: '', c: undefined, d: 0 } });
    expect(new URL(url).search).toBe('?a=x&d=0');
  });

  it('paginação lê meta', async () => {
    server.use(mswHttp.get(`${BASE}/l`, () => ok([1, 2], { page: 1, limit: 2, total: 5, totalPages: 3 })));
    const r = await apiGetPaged<number>('/l');
    expect(r.meta.total).toBe(5);
  });

  it.each([
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [422, 'VALIDATION_ERROR'],
    [429, 'RATE_LIMITED'],
    [500, 'INTERNAL'],
    [503, 'UNAVAILABLE'],
  ])('normaliza erro HTTP %i', async (status, code) => {
    server.use(mswHttp.get(`${BASE}/e`, () => fail(status, code, 'mensagem da API')));
    const err = await apiGet('/e').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status, code, kind: 'http', message: 'mensagem da API' });
  });

  it('erro sem envelope usa mensagem genérica (não vaza detalhes)', async () => {
    server.use(mswHttp.get(`${BASE}/e`, () => new HttpResponse('<html>stack</html>', { status: 502 })));
    const err = (await apiGet('/e').catch((e: unknown) => e)) as ApiError;
    expect(err.message).not.toContain('stack');
    expect(err.status).toBe(502);
  });

  it('falha de rede vira erro "network"', async () => {
    server.use(mswHttp.get(`${BASE}/n`, () => HttpResponse.error()));
    const err = (await apiGet('/n').catch((e: unknown) => e)) as ApiError;
    expect(err.kind).toBe('network');
  });

  it('resposta fora do contrato vira "invalid-response"', async () => {
    server.use(mswHttp.get(`${BASE}/i`, () => HttpResponse.json({ foo: 'bar' })));
    const err = (await apiGet('/i').catch((e: unknown) => e)) as ApiError;
    expect(err.kind).toBe('invalid-response');
  });

  it('requisição cancelada vira "canceled"', async () => {
    server.use(mswHttp.get(`${BASE}/c`, async () => { await new Promise((r) => setTimeout(r, 200)); return ok(1); }));
    const ctl = new AbortController();
    const p = apiGet('/c', { signal: ctl.signal }).catch((e: unknown) => e);
    ctl.abort();
    expect(((await p) as ApiError).kind).toBe('canceled');
  });
});

describe('401 → refresh → retry', () => {
  it('renova uma vez, repete a chamada e guarda o novo token só em memória', async () => {
    let refreshes = 0;
    server.use(
      mswHttp.post(`${BASE}/auth/refresh`, () => { refreshes++; return ok({ accessToken: 'novo', usuario: {} }); }),
      mswHttp.get(`${BASE}/priv`, ({ request }) => (request.headers.get('authorization') === 'Bearer novo' ? ok({ v: 1 }) : fail(401, 'UNAUTHORIZED'))),
    );
    tokenStore.set('velho');
    const [a, b] = await Promise.all([apiGet<{ v: number }>('/priv'), apiGet<{ v: number }>('/priv')]);
    expect(a.data.v).toBe(1);
    expect(b.data.v).toBe(1);
    expect(refreshes).toBe(1); // single-flight
    expect(tokenStore.get()).toBe('novo');
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('novo');
  });

  it('refresh falhando emite "expired" e propaga 401', async () => {
    server.use(
      mswHttp.post(`${BASE}/auth/refresh`, () => fail(401, 'UNAUTHORIZED')),
      mswHttp.get(`${BASE}/priv`, () => fail(401, 'UNAUTHORIZED')),
    );
    const cb = vi.fn();
    const off = onSessionEvent(cb);
    tokenStore.set('velho');
    const err = (await apiGet('/priv').catch((e: unknown) => e)) as ApiError;
    off();
    expect(err.status).toBe(401);
    expect(cb).toHaveBeenCalledWith('expired');
    expect(tokenStore.get()).toBeNull();
  });

  it('403 PASSWORD_CHANGE_REQUIRED emite evento de troca de senha', async () => {
    server.use(mswHttp.get(`${BASE}/p`, () => fail(403, 'PASSWORD_CHANGE_REQUIRED')));
    const cb = vi.fn();
    const off = onSessionEvent(cb);
    await apiGet('/p').catch(() => undefined);
    off();
    expect(cb).toHaveBeenCalledWith('password-change-required');
  });
});
