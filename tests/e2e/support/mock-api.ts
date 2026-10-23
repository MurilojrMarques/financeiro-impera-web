import type { Page } from '@playwright/test';
import type { Perfil } from '@/types/auth.types';
import type {
  Alerta, AfiliadoItem, Custo, DimRow, MetricasFormatadas, SerieRow, VendaItem,
} from '@/types/financial.types';
import type { TrafegoParametros, TrafegoResumo } from '@/types/trafego.types';

/**
 * API falsa para os testes de layout/responsividade: nenhuma chamada sai da máquina e os dados são determinísticos.
 * Os números do Tráfego reproduzem o print real do cliente (R$ 2.113.199,32 de faturamento etc.) para exercitar valores longos.
 */
export interface MockOptions {
  perfil?: Perfil;
  /** dados desatualizados (aviso âmbar), como no ambiente real */
  stale?: boolean;
  /** multiplica os valores monetários (estresse de largura: "R$ 21.131.993,20") */
  scale?: number;
  /** o refresh de sessão falha: a aplicação cai na tela de login */
  unauthenticated?: boolean;
  /** todas as listas vêm vazias */
  empty?: boolean;
  /** toda consulta de relatório responde 500 */
  failReports?: boolean;
}

type Params = URLSearchParams;
interface Reply { data: unknown; meta?: Record<string, unknown>; status?: number; noContent?: boolean }

/* ───────────── dados determinísticos ───────────── */

function rng(seed: string): () => number {
  let h = 2166136261;
  for (const c of seed) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const todayYmd = () => new Date().toISOString().slice(0, 10);

function daysBetween(de: string, ate: string): string[] {
  const out: string[] = [];
  const d = new Date(`${de}T00:00:00Z`);
  const end = new Date(`${ate}T00:00:00Z`);
  while (d <= end && out.length < 400) {
    out.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const LOJAS = ['NeuroSilence Gotas', 'Nervepure', 'Insulvita Gotas', 'Erevita', 'Neuropure', 'Articure Gotas', 'Artipure', 'Glicodrops', 'Memoforce', 'Gelatina Fit', 'Senior 100'];
const PRODUTOS = [
  '6 Nervepure - $397', '10 NeuroSilence - $597', '6 Insulvita Gotas - $397', '6 Erevita - $397', 'NeuroSilence Gotas - 5 Frascos',
  'NeuroSilence Gotas - 6 Frascos (teste)', '6 Neuropure $397', 'Articure Gotas - 6 Frascos', '[CALLCENTER] 3 Super Gel - $300',
  '[CALLCENTER] Memo Kare - 3 Potes - $300', 'Glicodrops - 3 Frascos - Black Friday',
];
const CAMPANHAS = ['BR | Conversão | NS6 | Broad', 'BR | Remarketing 7d', 'LAL 1% Compradores - NS', 'Search | Marca', 'Advantage+ | Nervepure', 'BR | Conversão | Erevita | Interesses'];
const ANUNCIOS = ['VSL_01_dor_neuropatia', 'UGC_depoimento_maria', 'Carrossel_beneficios_v3', 'Static_oferta_6frascos', 'UGC_medico_resposta'];
const METODOS = ['Cartão', 'Pix', 'Boleto'];
const ORIGENS = ['email', 'sms', 'whatsapp', 'organico', 'push'];
const ATENDENTES = ['Ana Paula', 'Bruno Lima', 'Carla Souza', 'Diego Martins'];
const TIPOS_ATENDIMENTO = ['upsell_cartao_kit', 'rec_abandono', 'rec_boleto', 'rec_pix'];

function metricas(pedidos: number, ticket: number, over: Partial<MetricasFormatadas> = {}): MetricasFormatadas {
  const bruto = pedidos * ticket;
  const estornos = Math.round(bruto * 0.025);
  const chargebacks = Math.round(bruto * 0.012);
  return {
    pedidos,
    brutoCentavos: bruto,
    receitaCentavos: bruto - estornos - chargebacks,
    comissaoCentavos: Math.round(bruto * 0.31),
    comissaoAfiliadoCentavos: Math.round(bruto * 0.05),
    comissaoAfiliadoEstimadaCentavos: 0,
    comissaoEstimadaCentavos: Math.round(bruto * 0.04),
    x1ComissaoRealCentavos: 0,
    pedidosSemComissao: 0,
    taxaCallCenterCentavos: Math.round(bruto * 0.02),
    estornosCentavos: estornos,
    estornosQtd: Math.round(pedidos * 0.02),
    chargebacksCentavos: chargebacks,
    chargebacksQtd: Math.round(pedidos * 0.01),
    ticketMedioCentavos: pedidos ? Math.round(bruto / pedidos) : 0,
    ...over,
  };
}

function dimRows(names: string[], pedidosTotal: number, ticket: number, seed: string, withNull = false): DimRow[] {
  const r = rng(seed);
  const weights = names.map((_, i) => 1 / (i + 1.2) + r() * 0.1);
  const sum = weights.reduce((a, b) => a + b, 0);
  const rows: DimRow[] = names.map((n, i) => ({
    chave: n,
    id: `${seed}-${i}`,
    ...metricas(Math.max(1, Math.round((pedidosTotal * weights[i]!) / sum)), Math.round(ticket * (0.8 + r() * 0.5))),
  }));
  if (withNull) rows.push({ chave: null, ...metricas(Math.round(pedidosTotal * 0.03), ticket) });
  return rows.sort((a, b) => b.receitaCentavos - a.receitaCentavos);
}

function serie(de: string, ate: string, pedidosTotal: number, ticket: number, seed: string): SerieRow[] {
  const days = daysBetween(de, ate);
  const r = rng(seed);
  return days.map((periodo, i) => {
    const f = 0.65 + 0.45 * Math.abs(Math.sin(i * 0.5)) + 0.25 * r();
    return { periodo, ...metricas(Math.max(0, Math.round((pedidosTotal / days.length) * f)), Math.round(ticket * (0.92 + r() * 0.16))) };
  });
}

function vendas(n: number, seed: string, opts: { loss?: boolean; groupe?: VendaItem['grupo'] } = {}): VendaItem[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const valor = [29700, 39700, 59700, 29000, 47800][Math.floor(r() * 5)]!;
    const status: VendaItem['status'] = opts.loss ? (r() > 0.6 ? 'CHARGEBACK' : 'ESTORNADO') : 'PAGO';
    const tipo: VendaItem['tipoVenda'] = r() > 0.85 ? 'UPSELL' : opts.groupe === 'CALL_CENTER' ? 'CALL_CENTER' : 'FRONT';
    const day = pad(1 + Math.floor(r() * 20));
    const hh = pad(Math.floor(r() * 24));
    const mm = pad(Math.floor(r() * 60));
    return {
      pedido: String(2949341 - i),
      grupo: opts.groupe ?? 'FRONT',
      tipoVenda: tipo,
      status,
      kitNome: PRODUTOS[Math.floor(r() * PRODUTOS.length)]!,
      metodoPagamento: METODOS[Math.floor(r() * 3)]!,
      parcelas: 1,
      valorTotalCentavos: valor,
      valorVendaCentavos: valor,
      jurosCentavos: 0,
      comissaoCentavos: Math.round(valor * 0.97),
      comissaoFonte: r() > 0.7 ? 'ESTIMADA' : 'PAGAH',
      comissaoAfiliadoCentavos: null,
      comissaoAfiliadoFonte: 'AUSENTE',
      taxaCallCenterCentavos: null,
      x1: r() > 0.93,
      origem: null,
      tipoAtendimento: null,
      atendente: ATENDENTES[Math.floor(r() * ATENDENTES.length)]!,
      campanha: CAMPANHAS[Math.floor(r() * CAMPANHAS.length)]!,
      anuncio: ANUNCIOS[Math.floor(r() * ANUNCIOS.length)]!,
      pagoEm: `2026-10-${day}T${hh}:${mm}:00-03:00`,
      estornadoEm: null,
      chargebackEm: null,
      perdaCentavos: opts.loss ? valor : 0,
      perdaTipo: opts.loss ? (status === 'CHARGEBACK' ? 'CHARGEBACK' : 'ESTORNO') : null,
      perdaEm: opts.loss ? `2026-10-${day}T${hh}:${mm}:00-03:00` : null,
      avisos: [],
      fonteVerdade: 'EVENTOS',
      loja: LOJAS[Math.floor(r() * LOJAS.length)]!,
      afiliado: r() > 0.8 ? { id: 'aff-1', nome: 'Andre Pinheiro' } : null,
    } satisfies VendaItem;
  });
}

function paged<T>(all: T[], p: Params): Reply {
  const limit = Math.max(1, Number(p.get('limit')) || 20);
  const page = Math.max(1, Number(p.get('page')) || 1);
  return {
    data: all.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total: all.length, totalPages: Math.max(1, Math.ceil(all.length / limit)) },
  };
}

/* ───────────── escala monetária (estresse) ───────────── */

const MONEY_KEY = /centavos$/i;
function scaleMoney<T>(value: T, k: number): T {
  if (k === 1) return value;
  if (Array.isArray(value)) return value.map((v) => scaleMoney(v, k)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) => [key, typeof v === 'number' && MONEY_KEY.test(key) ? Math.round(v * k) : scaleMoney(v, k)]),
    ) as T;
  }
  return value;
}

/* ───────────── tráfego (números do print do cliente) ───────────── */

function trafego(): TrafegoResumo {
  const faturamento = 211_319_932;
  const investimento = 126_549_556;
  const sobra = 18_721_403;
  const pedidos = 5193;
  const taxa = Math.round(faturamento * 0.1);
  const pis = Math.round(faturamento * 0.0065);
  const cofins = Math.round(faturamento * 0.03);
  const irpj = Math.round(faturamento * 0.0214);
  const csll = Math.round(faturamento * 0.0118);
  const frete = 9_298_077;
  const produto = faturamento - investimento - taxa - pis - cofins - irpj - csll - frete - sobra;
  const total = faturamento - sobra;
  const linha = (codigo: string, nome: string, rotulo: string, comoCalculado: string, valor: number) => ({
    codigo, nome, rotulo, comoCalculado, valorCentavos: valor,
    percentualFaturamentoBp: Math.round((valor / faturamento) * 10000),
    porPedidoCentavos: Math.round(valor / pedidos),
  });
  return {
    faturamentoCentavos: faturamento,
    pedidos,
    ticketMedioCentavos: 40_693,
    investimentoCentavos: investimento,
    roasCentesimos: 167,
    cpaCentavos: 24_368,
    mcBrCentavos: 14_094_088,
    linhas: [
      linha('investimento', 'Investimento em anúncios', '', 'Gasto em anúncios no período, todas as fontes (campanhas do RedTrack)', investimento),
      linha('cartao', 'Taxa de cartão', '10%', '10% sobre o faturamento de R$ 2.113.199,32', taxa),
      linha('pis', 'PIS', '0,65%', '0,65% sobre o faturamento de R$ 2.113.199,32', pis),
      linha('cofins', 'Cofins', '3%', '3% sobre o faturamento de R$ 2.113.199,32', cofins),
      linha('irpj', 'Provisão básica de IRPJ', '2,14%', '2,14% sobre o faturamento de R$ 2.113.199,32', irpj),
      linha('csll', 'Provisão básica de CSLL', '1,18%', '1,18% sobre o faturamento de R$ 2.113.199,32', csll),
      linha('frete', 'Frete', '5.193 × R$ 17,90', 'R$ 17,90 por remessa × 5.193 remessas (pedidos do mesmo cliente enviados juntos contam um frete só)', frete),
      linha('produto', 'Custo de produto', '31.580 un. em 6.204 itens vendidos', '31.580 unidades vendidas × custo unitário (gelatina R$ 9,90; demais R$ 6,10)', produto),
    ],
    totalCustosCentavos: total,
    totalCustosSemInvestimentoCentavos: total - investimento,
    totalCustosPorPedidoCentavos: Math.round(total / pedidos),
    totalCustosPercentualBp: Math.round((total / faturamento) * 10000),
    sobraCentavos: sobra,
    margemBp: 886,
    metaMargemBp: 2000,
    remessas: 5193,
    unidades: 31_580,
    itens: 6204,
    kitsSemQuantidade: 9,
    avisos: [
      '9 itens sem quantidade no nome do kit: contados como 1 unidade.',
          ],
    conferencia: {
      fonteBase: 'PAGAH',
      redtrack: { faturamentoCentavos: faturamento, pedidos },
      downsellsRedtrackCentavos: 1_588_800,
      planilha: { faturamentoCentavos: 212_830_544, pedidos: 5240 },
      diferencaFaturamentoCentavos: -1_510_612,
      diferencaFaturamentoBp: -71,
      diferencaPedidos: -47,
    },
  } satisfies TrafegoResumo;
}

const PARAMETROS: TrafegoParametros = {
  taxaCartaoBp: 1000, pisBp: 65, cofinsBp: 300, irpjBp: 214, csllBp: 118, freteCentavos: 1790,
  custoUnitario: { padraoCentavos: 610, regras: [{ contem: 'gelatina', centavos: 990 }] },
  metaMargemBp: 2000, janelaDeslocamentoMin: -180,
};

/* ───────────── roteador ───────────── */

function range(p: Params): { de: string; ate: string } {
  const today = todayYmd();
  return { de: p.get('de') ?? `${today.slice(0, 7)}-01`, ate: p.get('ate') ?? today };
}

/** volume de pedidos proporcional à duração do período (1 mês ≈ 8.380 pedidos) */
function volume(p: Params, perMonth: number): number {
  const { de, ate } = range(p);
  return Math.max(3, Math.round((perMonth / 30) * daysBetween(de, ate).length));
}

const ALERTAS: Alerta[] = [
  { codigo: 'COMISSAO_ESTIMADA', severidade: 'aviso', mensagem: 'O total de comissão inclui valores estimados por regra configurada.' },
  { codigo: 'REEMBOLSO_PIX', severidade: 'info', mensagem: 'Alguns reembolsos de Pix não chegam pelo webhook Pagah e não são conhecidos por esta API; nada é estimado.' },
  { codigo: 'UNIDADES', severidade: 'info', mensagem: 'Unidades vendidas não existem na planilha e não são presumidas.' },
];

function handle(method: string, path: string, p: Params, o: MockOptions): Reply | null {
  const empty = !!o.empty;
  const E = <T,>(v: T[]): T[] => (empty ? [] : v);
  const ped = (perMonth: number) => (empty ? 0 : volume(p, perMonth));
  const { de, ate } = range(p);
  const ticket = 36_200;

  // ── autenticação
  if (path === '/auth/refresh' || path === '/auth/login') {
    if (o.unauthenticated && path === '/auth/refresh') return { status: 401, data: null };
    return {
      data: {
        accessToken: 'mock-token', tokenType: 'Bearer', expiresIn: 900,
        usuario: { id: 'u1', nome: 'Murilo Marques', email: 'murilo.marques@docato.com.br', perfil: o.perfil ?? 'ADMIN', trocaSenhaObrigatoria: false },
      },
    };
  }
  if (path === '/auth/logout' || path === '/auth/logout-all') return { data: null, noContent: true };
  if (path === '/auth/sessions') {
    return { data: [
      { id: 's1', ip: '187.12.34.56', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', criadoEm: minutesAgo(600), ultimoUsoEm: minutesAgo(1), expiraEm: minutesAgo(-10_000), atual: true },
      { id: 's2', ip: '177.45.1.9', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', criadoEm: minutesAgo(3000), ultimoUsoEm: minutesAgo(240), expiraEm: minutesAgo(-9000), atual: false },
    ] };
  }

  if (o.failReports && !path.startsWith('/integracoes')) {
    return { status: 500, data: null };
  }

  const meta = { periodo: { de, ate }, criterioFinanceiro: p.get('modo') ?? 'MOVIMENTACAO', ultimaSincronizacao: minutesAgo(o.stale === false ? 2 : 46), dadosDesatualizados: o.stale !== false };

  // ── integrações
  if (path === '/integracoes/sheets/status') {
    const stale = o.stale !== false;
    return { data: {
      estado: stale ? 'DESATUALIZADO' : 'ATUALIZADO', dadosDesatualizados: stale, ultimaSincronizacao: minutesAgo(stale ? 46 : 2), sincronizandoAgora: null, limiteDesatualizadoSegundos: 300,
      fontes: [
        { fonte: 'EVENTOS', estado: 'ATUALIZADA', ultimoSucessoEm: minutesAgo(46), ultimaLeituraEm: minutesAgo(46), intervaloSegundos: 60 },
        { fonte: 'HISTORICO', estado: 'ATUALIZADA', ultimoSucessoEm: minutesAgo(900), ultimaLeituraEm: minutesAgo(900), intervaloSegundos: 86_400 },
        { fonte: 'REDTRACK', estado: 'ATUALIZADA_COM_ERROS', ultimoSucessoEm: minutesAgo(50), ultimaLeituraEm: minutesAgo(50), intervaloSegundos: 300, ultimoErro: 'Linha 188: payout inválido' },
      ],
    } };
  }
  if (path === '/integracoes/sheets/fontes') {
    return { data: ['EVENTOS', 'HISTORICO', 'REDTRACK'].map((f) => ({
      fonte: f, aba: f, estado: 'ATUALIZADA', intervaloSegundos: 60, ultimoSucessoEm: minutesAgo(46),
      cabecalhosReconhecidos: ['pedido', 'status', 'valor', 'loja', 'kit', 'metodo', 'pago_em', 'comissao', 'origem', 'campanha', 'anuncio', 'afiliado'], cabecalhosOpcionaisAusentes: ['utm_source', 'src'], cursorUltimaLinha: 48_210,
    })) };
  }
  if (path === '/integracoes/sheets/execucoes') {
    return paged(Array.from({ length: 41 }, (_, i) => ({
      id: `e${i}`, fonte: (['EVENTOS', 'REDTRACK', 'HISTORICO'] as const)[i % 3]!, modo: i % 7 === 0 ? 'COMPLETA' : 'INCREMENTAL',
      status: (['SUCESSO', 'SUCESSO', 'PARCIAL', 'FALHA'] as const)[i % 4]!, iniciadaEm: minutesAgo(i * 17), finalizadaEm: minutesAgo(i * 17 - 1), duracaoMs: 4000 + i * 130,
      lidos: 594 - i, inseridos: 86, atualizados: 6, ignorados: 502, comErro: i % 4 === 3 ? 3 : 0, erro: i % 4 === 3 ? 'Planilha inacessível: tempo esgotado ao ler a aba' : null, disparadaPor: i % 5 === 0 ? 'manual:murilo' : 'agendador',
    })), p);
  }
  if (path === '/integracoes/sheets/erros') {
    return paged(Array.from({ length: 23 }, (_, i) => ({ id: `r${i}`, fonte: 'REDTRACK', linhaOrigem: 100 + i, codigo: 'PAYOUT_INVALIDO', campo: 'payout', mensagem: 'Valor monetário não reconhecido na célula', criadoEm: minutesAgo(i * 40), sincronizacaoId: null })), p);
  }

  if (path === '/integracoes/sheets/sincronizar' || path === '/integracoes/sheets/reconciliar') return { data: { aceita: true, fontes: ['EVENTOS'], modo: 'INCREMENTAL' }, status: 202 };

  // ── tráfego
  if (path === '/trafego/resumo') return { data: trafego(), meta };
  if (path === '/trafego/parametros') return { data: { parametros: PARAMETROS, padrao: PARAMETROS } };

  // ── dashboard
  if (path === '/dashboard/resumo') {
    const pedidos = ped(8380);
    const front = metricas(Math.round(pedidos * 0.75), 31_700);
    const cc = metricas(Math.round(pedidos * 0.24), 29_700);
    const afil = metricas(Math.round(pedidos * 0.011), 33_900);
    const zero = metricas(0, 0);
    const geral = metricas(pedidos, ticket);
    const receita = front.receitaCentavos + cc.receitaCentavos + afil.receitaCentavos;
    return { meta, data: {
      kpis: {
        ...geral, receitaCentavos: receita,
        receitaFrontCentavos: front.receitaCentavos, receitaBackendOutrosCentavos: 0, receitaCallCenterCentavos: cc.receitaCentavos, receitaAfiliadosCentavos: afil.receitaCentavos, receitaNaoClassificadaCentavos: 0,
        receitaBackendTotalCentavos: cc.receitaCentavos,
        custos: { disponivel: true, custosCentavos: Math.round(receita * 0.38), resultadoOperacionalCentavos: Math.round(receita * 0.62), margemOperacionalPercentual: 62 },
      },
      receitasPorGrupo: {
        grupos: { front, backendOutros: zero, callCenter: cc, afiliados: afil, naoClassificadas: zero },
        backendTotal: cc, geral, composicao: { receitaGeral: 'Front + Back-end Outros + Call Center + Afiliados + Não classificadas', backendTotal: 'Back-end Outros + Call Center' },
      },
      alertas: ALERTAS,
    } };
  }
  if (path === '/dashboard/trafego') return { meta, data: { investimentoCentavos: 121_189_738, comissaoFrontCentavos: 14_094_088, comissaoCallCenterCentavos: 2_500_000, comissaoRecuperacaoCentavos: 300_000, comissaoTotalCentavos: 16_594_088, receitaTotalCentavos: 250_000_000, roasTotalCentesimos: 206, fonteInvestimento: 'REDTRACK', mensagem: null } };
  if (path === '/dashboard/evolucao' || path === '/vendas/por-dia') return { meta, data: serie(de, ate, ped(8380), ticket, 'dash') };
  if (path === '/dashboard/distribuicao-receitas') {
    const t = 262_787_728;
    return { meta, data: {
      totalCentavos: t,
      distribuicao: [
        { grupo: 'FRONT', receitaCentavos: 199_461_686, participacaoPercentual: 75.9 }, { grupo: 'BACKEND_OUTROS', receitaCentavos: 0, participacaoPercentual: 0 },
        { grupo: 'CALL_CENTER', receitaCentavos: 60_169_896, participacaoPercentual: 22.9 }, { grupo: 'AFILIADO', receitaCentavos: 3_156_146, participacaoPercentual: 1.2 },
        { grupo: 'NAO_CLASSIFICADA', receitaCentavos: 0, participacaoPercentual: 0 },
      ],
      backendTotal: { receitaCentavos: 60_169_896, participacaoPercentual: 22.9, nota: 'Agregado' },
    } };
  }
  if (path === '/dashboard/receitas-por-loja' || path === '/front/por-loja' || path === '/vendas/por-loja' || path === '/call-center/por-loja' || path === '/backend/por-loja' || path === '/afiliados/por-loja' || path === '/campanhas/por-loja') {
    return { meta, data: E(dimRows(LOJAS, ped(8380), ticket, `lojas${path}`)) };
  }
  if (path === '/vendas/por-produto' || path === '/front/por-produto' || path === '/call-center/por-produto' || path === '/backend/por-produto') return { meta, data: E(dimRows(PRODUTOS, ped(8380), ticket, `prod${path}`)) };
  if (path === '/vendas/por-metodo' || path === '/call-center/por-metodo') return { meta, data: E(dimRows(METODOS, ped(8380), ticket, 'metodos')) };
  if (path === '/vendas/por-origem' || path === '/backend/por-origem') return { meta, data: E(dimRows(ORIGENS, ped(1200), ticket, 'origens', true)) };
  if (path === '/campanhas') return { meta, data: E(dimRows(CAMPANHAS, ped(6500), ticket, 'camp', true)) };
  if (path === '/campanhas/por-anuncio' || path === '/front/por-anuncio') return { meta, data: E(dimRows(ANUNCIOS, ped(6500), ticket, 'anu', true)) };
  if (path === '/front/por-campanha') return { meta, data: E(dimRows(CAMPANHAS, ped(6500), ticket, 'camp-front', true)) };
  if (path === '/call-center/por-atendente') return { meta, data: E(dimRows(ATENDENTES, ped(2025), ticket, 'atend', true)) };
  if (path === '/call-center/por-tipo-atendimento') return { meta, data: E(dimRows(TIPOS_ATENDIMENTO, ped(2025), ticket, 'tipoat', true)) };
  if (path === '/call-center/recuperacoes') {
    return { meta, data: E((['PIX', 'BOLETO', 'ABANDONO', 'OUTROS', 'NAO_INFORMADO'] as const).map((categoria, i) => ({ categoria, ...metricas(Math.max(0, 600 - i * 130), ticket) }))) };
  }

  if (path === '/vendas/resumo') return { meta, data: { ...metricas(ped(6262), 36_754), alertas: ALERTAS.slice(0, 2) } };

  // ── vendas paginadas
  if (path === '/vendas' || path === '/front/vendas' || path === '/front/compras' || path === '/front/upsells' || path === '/front/downsells') return paged(E(vendas(8380, `v${path}`)), p);
  if (path === '/call-center/vendas') return paged(E(vendas(2025, 'cc', { groupe: 'CALL_CENTER' })), p);
  if (path === '/backend/vendas') return paged(E(vendas(310, 'be', { groupe: 'BACKEND_OUTROS' })), p);
  if (path === '/backend/nao-classificadas') return paged(E(vendas(14, 'nc', { groupe: 'NAO_CLASSIFICADA' })), p);
  if (path === '/reembolsos' || path === '/reembolsos/estornos' || path === '/reembolsos/chargebacks') return paged(E(vendas(842, `rb${path}`, { loss: true })), p);

  // ── front
  if (path === '/front/resumo') {
    const total = metricas(ped(6262), 36_754);
    return { meta, data: {
      ...total, brutoCentavos: 230_150_531,
      porTipo: { compras: metricas(ped(5646), 33_600), upsells: metricas(ped(616), 15_900), downsells: metricas(0, 0, { receitaCentavos: -78_800 }) },
      conversaoUpsell: { pedidosUpsell: 616, pedidosCompra: 5646, conversaoUpsellPercentual: 10.91 }, unidades: { disponivel: false, motivo: 'sem unidades' },
    } };
  }
  if (path === '/front/conversao-upsell') {
    return { meta, data: { geral: { pedidosUpsell: 616, pedidosCompra: 5646, conversaoUpsellPercentual: 10.91 }, porLoja: LOJAS.slice(0, 8).map((loja, i) => ({ loja, pedidosUpsell: 120 - i * 12, pedidosCompra: 1100 - i * 100, conversaoUpsellPercentual: 10.9 - i * 0.4 })) } };
  }
  if (path === '/front/evolucao' || path === '/backend/evolucao' || path === '/call-center/evolucao' || path === '/afiliados/evolucao' || path === '/reembolsos/evolucao' || /^\/afiliados\/[^/]+\/evolucao$/.test(path)) {
    return { meta, data: serie(de, ate, ped(path.includes('call') ? 2025 : 6262), ticket, `ev${path}`) };
  }

  // ── backend
  if (path === '/backend/resumo') return { meta, data: { ...metricas(ped(1180), 35_000), alertas: ALERTAS.slice(0, 1) } };
  if (path === '/backend/total') {
    const m = metricas(ped(3200), 31_000);
    return { meta, data: { backendOutros: metricas(ped(1180), 35_000), callCenter: metricas(ped(2025), 29_700), backendTotal: m, composicao: 'Back-end Outros + Call Center' } };
  }
  if (path === '/backend/por-canal') return { meta, data: E(['SMS', 'E-mail', 'WhatsApp'].map((canal, i) => ({ canal, ...metricas(Math.max(1, ped(500) - i * 120), ticket) }))) };

  // ── call center
  if (path === '/call-center/resumo') {
    return { meta, data: {
      ...metricas(ped(2025), 29_700), alertas: ALERTAS, unidades: { disponivel: false, motivo: 'Quantidade de unidades não existe na planilha' },
      sobraOperacionalEstimadaCentavos: 21_340_000, margemPercentual: 35.4, custosCentavos: 38_900_000, custosPorCategoria: [], metodologiaCustos: '', observacaoSobra: '',
    } };
  }
  if (path === '/call-center/comissoes') return { meta, data: { comissaoCentavos: 54_234_685, comissaoEstimadaCentavos: 1_200_000, taxaCallCenterCentavos: 0, pedidosSemComissao: 0, observacao: 'Comissão da operação e taxa do Call Center são campos distintos e não são somados.' } };
  if (path === '/call-center/custos') {
    return { meta, data: { totalCentavos: 38_900_000, porCategoria: [
      { categoriaId: 'c1', categoria: 'Folha de atendentes', totalCentavos: 21_000_000 }, { categoriaId: 'c2', categoria: 'Telefonia', totalCentavos: 6_800_000 }, { categoriaId: 'c3', categoria: 'Comissão de equipe', totalCentavos: 11_100_000 },
    ], regrasIndisponiveis: [{ regraId: 'r9', nome: 'Custo por unidade', motivo: 'unidades indisponíveis' }], metodologia: 'Custos = lançamentos manuais com vencimento no período + regras de custo vigentes.' } };
  }
  if (path === '/financeiro/regras-custo') return { data: [{ id: 'r1', nome: 'Comissão de equipe', tipo: 'PERCENTUAL_RECEITA', grupo: 'CALL_CENTER', categoriaId: 'c3', valorCentavos: null, percentualBps: 500, vigenteDe: '2026-01-01', vigenteAte: null, metodologia: 'Percentual da receita', ativa: true }] };

  // ── afiliados
  if (path === '/afiliados/resumo') return { meta, data: { ...metricas(ped(93), 33_900), afiliadosAtivos: 12 } };
  if (path === '/afiliados/ranking') return { meta, data: E(afiliados(10).map((a, i) => ({ ...a, posicao: i + 1 }))) };
  if (path === '/afiliados') return paged(E(afiliados(64)), p);
  if (/^\/afiliados\/[^/]+$/.test(path)) return { data: { id: 'aff-1', nome: 'Andre Pinheiro', criadoEm: minutesAgo(90_000), _count: { aliases: 2, regras: 1, vendas: 93 } } };
  if (/^\/afiliados\/[^/]+\/resumo$/.test(path)) return { meta, data: { ...metricas(ped(93), 33_900), reembolsosCentavos: 215_000 } };
  if (/^\/afiliados\/[^/]+\/comissoes$/.test(path)) return { meta, data: { comissaoAfiliadoCentavos: 1_575_000, comissaoOperacaoCentavos: 2_445_799, porFonteDaComissaoDoAfiliado: [{ fonte: 'PAGAH', pedidos: 70, comissaoCentavos: 1_200_000 }, { fonte: 'REGRA_AFILIADO', pedidos: 23, comissaoCentavos: 375_000 }] } };
  if (/^\/afiliados\/[^/]+\/vendas$/.test(path)) return paged(E(vendas(93, 'afv')), p);
  if (/^\/afiliados\/[^/]+\/aliases$/.test(path)) return { data: [{ id: 'al1', alias: 'andre pinheiro', criadoEm: minutesAgo(5000) }, { id: 'al2', alias: 'André Pinheiro', criadoEm: minutesAgo(4000) }] };
  if (/^\/afiliados\/[^/]+\/regras-comissao$/.test(path)) return { data: [{ id: 'rc1', valorFixoCentavos: null, percentualBps: 1250, vigenteDe: '2026-01-01', vigenteAte: null, fonte: 'Contrato assinado em jan/2026 (e-mail do parceiro)', observacao: null, criadoEm: minutesAgo(9000) }] };

  // ── reembolsos
  if (path === '/reembolsos/resumo') {
    return { meta, data: { ...metricas(ped(8380), ticket), perdaTotalCentavos: 40_569_624, pedidosComEstornoEChargeback: 18, perdasSemData: 7, limitacoes: ['Estorno de Pix não chega pelo webhook Pagah.', 'Chargebacks têm contestação em até 120 dias.'] } };
  }
  if (path === '/reembolsos/por-loja' || path === '/reembolsos/por-grupo') {
    const names = path.endsWith('grupo') ? ['FRONT', 'CALL_CENTER', 'AFILIADO'] : LOJAS;
    return { meta, data: E(dimRows(names, ped(8380), ticket, 'rb-dim')) };
  }

  // ── campanhas / redtrack
  if (path === '/campanhas/resumo') return { meta, data: { ...metricas(ped(6500), ticket), vendasComCampanha: 6021, vendasSemCampanha: 2359 } };
  if (path === '/redtrack/conciliacao') {
    return { meta, data: { vendasNoPeriodo: 8380, vendasComRedtrack: 6021, vendasSemRedtrack: 2359, coberturaPercentual: 71.85, conversoesSemVenda: 12, porSituacao: [{ situacao: 'approved', quantidade: 5990 }, { situacao: 'pending', quantidade: 31 }, { situacao: null, quantidade: 4 }], observacao: 'A cobertura mede quantas vendas têm conversão correspondente no RedTrack.' } };
  }
  if (path === '/redtrack/divergencias') {
    return paged(E(Array.from({ length: 27 }, (_, i) => ({ pedido: String(2900000 + i * 13), tipo: i % 3 === 0 ? ('SEM_VENDA' as const) : ('PAYOUT_DIFERENTE_DA_COMISSAO' as const), payoutCentavos: 38_000 + i * 10, comissaoCentavos: i % 3 === 0 ? null : 38_500, situacao: 'approved' }))), p);
  }
  if (path === '/redtrack/conversoes') {
    return paged(E(Array.from({ length: 60 }, (_, i) => ({ pedido: String(2800000 + i * 7), conversaoId: `cv${i}`, payoutCentavos: 38_000, situacao: 'approved', campanha: CAMPANHAS[i % CAMPANHAS.length]!, anuncio: ANUNCIOS[i % ANUNCIOS.length]!, vendaId: i % 5 ? `v${i}` : null, sincronizadoEm: minutesAgo(i * 9) }))), p);
  }

  // ── custos
  if (path === '/custos/resumo') {
    return { meta, data: { totalLancamentosCentavos: empty ? 0 : 48_920_000, porCategoria: E([{ categoriaId: 'c1', categoria: 'Folha de atendentes', totalCentavos: 21_000_000 }, { categoriaId: 'c2', categoria: 'Telefonia', totalCentavos: 6_800_000 }, { categoriaId: 'c3', categoria: 'Softwares e ferramentas', totalCentavos: 4_120_000 }, { categoriaId: 'c4', categoria: 'Impostos', totalCentavos: 17_000_000 }]), porGrupo: [], ocorrencias: empty ? 0 : 34, projetadas: 6, pagoCentavos: 30_100_000, pendenteCentavos: 18_820_000, metodologia: 'Lançamentos com vencimento no período (recorrências projetadas incluídas e sinalizadas).' } };
  }
  if (path === '/custos/categorias') return { data: [{ id: 'c1', nome: 'Folha de atendentes', ativa: true }, { id: 'c2', nome: 'Telefonia', ativa: true }, { id: 'c3', nome: 'Softwares e ferramentas', ativa: true }, { id: 'c4', nome: 'Impostos', ativa: false }] };
  if (path === '/custos/recorrencias') return { data: [{ id: 'rec1', periodicidade: 'MENSAL', inicio: '2026-01-05', fim: null }, { id: 'rec2', periodicidade: 'ANUAL', inicio: '2026-03-10', fim: '2028-03-10' }] };
  if (path === '/custos') {
    return paged(E(Array.from({ length: 34 }, (_, i): Custo => ({
      id: `k${i}`, descricao: ['Folha de pagamento — atendentes', 'Licença do CRM', 'Telefonia VoIP', 'Hospedagem e CDN', 'Contador'][i % 5]!, tipo: i % 2 ? 'FIXO' : 'VARIAVEL', grupo: null, valorCentavos: 150_000 + i * 21_300,
      vencimento: `2026-10-${pad(1 + (i % 28))}`, statusPagamento: (['PAGO', 'PENDENTE', 'PENDENTE', 'CANCELADO'] as const)[i % 4]!, observacao: null, criadoEm: minutesAgo(9000), atualizadoEm: minutesAgo(9000),
      categoria: { id: 'c1', nome: ['Folha de atendentes', 'Softwares e ferramentas', 'Telefonia'][i % 3]! }, recorrencia: i % 2 ? { id: 'rec1', periodicidade: 'MENSAL', inicio: '2026-01-05', fim: null } : null, responsavel: null, _count: { anexos: i % 3 },
    }))), p);
  }
  if (/^\/custos\/[^/]+\/anexos$/.test(path)) return { data: [{ id: 'a1', nomeOriginal: 'nota-fiscal-outubro.pdf', mime: 'application/pdf', tamanhoBytes: 184_320, criadoEm: minutesAgo(900) }] };

  // ── admin
  if (path === '/usuarios') {
    return paged(Array.from({ length: 9 }, (_, i) => ({ id: `u${i}`, nome: ['Murilo Marques', 'Ana Souza', 'Rafael Gomes', 'Beatriz Lima'][i % 4]!, email: `usuario${i}@docato.com.br`, perfil: (['ADMIN', 'FINANCEIRO', 'ANALISTA', 'LEITURA'] as const)[i % 4]!, ativo: i % 5 !== 4, trocaSenhaObrig: i === 3, ultimoLoginEm: minutesAgo(i * 300), criadoEm: minutesAgo(90_000) })), p);
  }
  if (path === '/admin/auditoria') {
    return paged(Array.from({ length: 25 }, (_, i) => ({ id: `au${i}`, acao: ['custo.criar', 'afiliado.alias.criar', 'trafego.parametros.salvar'][i % 3]!, entidade: 'Custo', entidadeId: `abcdef12-0000-0000-0000-00000000000${i % 10}`, detalhes: null, ip: '187.12.34.56', criadoEm: minutesAgo(i * 120), usuario: { id: 'u1', nome: 'Murilo Marques', email: 'murilo.marques@docato.com.br' } })), p);
  }
  if (path === '/classificacoes/regras') {
    return { data: [{ id: 'cr1', nome: 'Disparos de SMS', campo: 'ORIGEM', operador: 'CONTEM', valor: 'sms', grupo: 'BACKEND_OUTROS', canal: 'SMS', prioridade: 10, ativa: true, versao: 2 }, { id: 'cr2', nome: 'WhatsApp oficial', campo: 'ORIGEM', operador: 'COMECA_COM', valor: 'wpp', grupo: 'BACKEND_OUTROS', canal: 'WhatsApp', prioridade: 20, ativa: false, versao: 1 }] };
  }
  if (path === '/classificacoes/pendencias') return { data: { totalPendentes: 14, agrupamentos: [{ tipoBruto: 'OUTRO', origem: null, tipoAtendimento: null, pedidos: 9, valorVendaCentavos: 358_000 }, { tipoBruto: 'FRONT', origem: 'desconhecida', tipoAtendimento: null, pedidos: 5, valorVendaCentavos: 198_500 }], orientacao: 'Crie uma regra de classificação para a combinação mais frequente.' } };

  void method;
  return null;
}

function afiliados(n: number): AfiliadoItem[] {
  const r = rng('afil');
  const nomes = ['Andre Pinheiro', '544', '219', 'Joana Marketing', 'Canal do Dr. Paulo', 'Mariana Oliveira', 'Grupo Saúde Já', 'Rede Bem Estar', 'Lucas Afiliados', 'Cláudia Ribeiro'];
  return Array.from({ length: n }, (_, i) => {
    const pedidos = Math.max(1, Math.round(90 / (i * 0.6 + 1) + r() * 5));
    return {
      id: `aff-${i + 1}`, nome: nomes[i % nomes.length]! + (i >= nomes.length ? ` ${Math.floor(i / nomes.length) + 1}` : ''), pedidos, faturamentoCentavos: pedidos * 33_900, receitaLiquidaCentavos: pedidos * 32_500,
      comissaoCentavos: Math.round(pedidos * 33_900 * 0.05), comissaoOperacaoCentavos: Math.round(pedidos * 33_900 * 0.3), reembolsosCentavos: Math.round(pedidos * 33_900 * 0.02), ticketMedioCentavos: 33_900,
    };
  });
}

/* ───────────── instalação ───────────── */

export async function installMockApi(page: Page, options: MockOptions = {}): Promise<{ unhandled: string[] }> {
  const unhandled: string[] = [];
  await page.route(/\/api\/v1\//, async (route) => {
    const req = route.request();
    const origin = req.headers()['origin'] ?? 'http://localhost:5173';
    const cors = {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization,content-type,x-requested-with,x-csrf-token',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      vary: 'origin',
    };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });

    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '').replace(/\/+$/, '') || '/';
    const reply = handle(req.method(), path, url.searchParams, options);
    if (!reply) {
      unhandled.push(`${req.method()} ${path}`);
      return route.fulfill({ status: 404, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: `mock: ${path}` } }) });
    }
    if (reply.noContent) return route.fulfill({ status: 204, headers: cors });
    if (reply.status && reply.status >= 400) {
      return route.fulfill({ status: reply.status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ success: false, error: { code: 'MOCK', message: 'Falha simulada' } }) });
    }
    return route.fulfill({
      status: reply.status ?? 200,
      headers: { ...cors, 'content-type': 'application/json' },
      body: JSON.stringify({ success: true, data: scaleMoney(reply.data, options.scale ?? 1), meta: reply.meta ?? {} }),
    });
  });
  return { unhandled };
}
