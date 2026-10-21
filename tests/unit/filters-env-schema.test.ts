import { describe, expect, it } from 'vitest';
import { costSchema } from '@/features/custos/cost-schemas';
import { parseFilters, serializeFilters, toApiParams } from '@/hooks/useFilters';
import { parseEnv } from '@/lib/env';

const HOJE = '2026-10-20';
const parse = (q: string) => parseFilters(new URLSearchParams(q), HOJE);

describe('filtros na URL', () => {
  it('padrão: mês atual, sem comparação', () => {
    expect(parse('')).toMatchObject({ periodo: 'mes-atual', de: '2026-10-01', ate: HOJE, comparar: 'nenhuma' });
  });
  it('valores inválidos caem no padrão (link malformado não quebra)', () => {
    expect(parse('periodo=xyz&comparar=zzz&modo=foo')).toMatchObject({ periodo: 'mes-atual', comparar: 'nenhuma' });
    expect(parse('periodo=personalizado&de=2026-10-10&ate=2026-10-01').periodo).toBe('mes-atual');
    expect(parse('periodo=personalizado&de=2026-13-01&ate=2026-13-02').periodo).toBe('mes-atual');
  });
  it('período personalizado válido', () => {
    expect(parse('periodo=personalizado&de=2026-09-01&ate=2026-09-15')).toMatchObject({ de: '2026-09-01', ate: '2026-09-15' });
  });
  it('ida e volta preserva o estado', () => {
    const f = parse('periodo=7d&comparar=periodo-anterior&modo=APROVADAS&loja=abc');
    expect(parse(serializeFilters(f).toString())).toEqual(f);
  });
  it('padrões são omitidos da URL', () => {
    expect(serializeFilters(parse('')).toString()).toBe('');
  });
  it('toApiParams envia de/ate e só filtros preenchidos', () => {
    const p = toApiParams(parse('periodo=7d&loja=abc'));
    expect(p).toMatchObject({ de: '2026-10-14', ate: HOJE, loja: 'abc' });
    expect(p.produto).toBeUndefined();
  });
  it('limita tamanho de valores de filtro', () => {
    expect((parse(`loja=${'x'.repeat(500)}`).loja ?? '').length).toBe(200);
  });
});

describe('parseEnv', () => {
  it('aplica padrões e remove barra final', () => {
    const e = parseEnv({ VITE_API_BASE_URL: 'https://api.exemplo.com/api/v1/' });
    expect(e.apiBaseUrl).toBe('https://api.exemplo.com/api/v1');
    expect(e.defaultCriterio).toBe('MOVIMENTACAO');
    expect(e.staleAfterSeconds).toBe(300);
  });
  it('aceita caminho relativo (hospedagem que repassa /api para a API)', () => {
    expect(parseEnv({ VITE_API_BASE_URL: '/api/v1/' }).apiBaseUrl).toBe('/api/v1');
    expect(() => parseEnv({ VITE_API_BASE_URL: '//evil.com/api' })).toThrow(/Configuração inválida/);
  });
  it('string vazia equivale a não definida', () => {
    expect(parseEnv({ VITE_API_BASE_URL: '' }).apiBaseUrl).toBe('http://localhost:3000/api/v1');
  });
  it('rejeita configuração inválida com mensagem clara', () => {
    expect(() => parseEnv({ VITE_API_BASE_URL: 'nao-e-url' })).toThrow(/Configuração inválida/);
    expect(() => parseEnv({ VITE_DEFAULT_CRITERIO: 'X' })).toThrow(/Configuração inválida/);
  });
});

const custo = { descricao: 'Servidor', categoriaId: 'c1', recorrencia: 'MENSAL', valorCentavos: 12345, vencimento: '2026-10-20', statusPagamento: 'PENDENTE' };

describe('costSchema', () => {
  it('aceita custo válido', () => expect(costSchema.safeParse(custo).success).toBe(true));
  it('exige valor positivo, inteiro e informado', () => {
    expect(costSchema.safeParse({ ...custo, valorCentavos: 0 }).success).toBe(false);
    expect(costSchema.safeParse({ ...custo, valorCentavos: null }).success).toBe(false);
    expect(costSchema.safeParse({ ...custo, valorCentavos: 10.5 }).success).toBe(false);
  });
  it('rejeita data inválida, descrição curta e recorrência inexistente (semestral)', () => {
    expect(costSchema.safeParse({ ...custo, vencimento: '2026-02-30' }).success).toBe(false);
    expect(costSchema.safeParse({ ...custo, descricao: 'a' }).success).toBe(false);
    expect(costSchema.safeParse({ ...custo, recorrencia: 'SEMESTRAL' }).success).toBe(false);
  });
});
