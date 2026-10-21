/**
 * Verifica, contra uma API REAL em execução, se cada endpoint usado pelo frontend responde com os campos que os tipos
 * TypeScript esperam. Uso:
 *   API_URL=http://localhost:3000/api/v1 API_EMAIL=... API_PASSWORD=... node scripts/contract-check.mjs
 * Não imprime valores de dados, só nomes de campos e status. A senha vem do ambiente (nunca do código).
 */
const base = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const email = process.env.API_EMAIL;
const senha = process.env.API_PASSWORD;
if (!email || !senha) {
  console.error('Defina API_EMAIL e API_PASSWORD.');
  process.exit(2);
}

const hoje = new Date().toISOString().slice(0, 10);
const de = `${hoje.slice(0, 7)}-01`;
const q = `de=${de}&ate=${hoje}`;

const M = ['pedidos', 'brutoCentavos', 'receitaCentavos', 'comissaoCentavos', 'comissaoAfiliadoCentavos', 'comissaoAfiliadoEstimadaCentavos', 'comissaoEstimadaCentavos', 'x1ComissaoRealCentavos', 'pedidosSemComissao', 'taxaCallCenterCentavos', 'estornosCentavos', 'estornosQtd', 'chargebacksCentavos', 'chargebacksQtd', 'ticketMedioCentavos'];
const VENDA = ['pedido', 'grupo', 'tipoVenda', 'status', 'valorVendaCentavos', 'comissaoCentavos', 'comissaoFonte', 'comissaoAfiliadoCentavos', 'x1', 'pagoEm', 'perdaCentavos', 'loja', 'afiliado'];

/** [caminho, campos exigidos no data (objeto) ou no 1º item (lista), paginado?] */
const checks = [
  ['/dashboard/resumo?' + q, ['kpis', 'receitasPorGrupo', 'alertas']],
  ['/dashboard/kpis?' + q, [...M, 'receitaFrontCentavos', 'receitaBackendOutrosCentavos', 'receitaCallCenterCentavos', 'receitaAfiliadosCentavos', 'receitaNaoClassificadaCentavos', 'receitaBackendTotalCentavos', 'custos']],
  ['/dashboard/evolucao?' + q, ['periodo', ...M]],
  ['/dashboard/comparativo?' + q, ['atual', 'anterior', 'variacaoPercentual']],
  ['/dashboard/distribuicao-receitas?' + q, ['totalCentavos', 'distribuicao', 'backendTotal']],
  ['/dashboard/receitas-por-grupo?' + q, ['grupos', 'backendTotal', 'geral']],
  ['/dashboard/receitas-por-loja?' + q, ['chave', ...M]],
  ['/dashboard/indicadores?' + q, ['codigo', 'valor', 'unidade', 'disponivel', 'metodologia']],
  ['/vendas?' + q + '&limit=3', VENDA, true],
  ['/vendas/por-produto?' + q, ['chave', ...M]],
  ['/vendas/por-metodo?' + q, ['chave', ...M]],
  ['/front/resumo?' + q, [...M, 'porTipo', 'conversaoUpsell', 'unidades']],
  ['/vendas/resumo?' + q + '&grupo=FRONT', [...M, 'alertas']],
  ['/front/conversao-upsell?' + q, ['geral', 'porLoja']],
  ['/front/por-campanha?' + q, ['chave', ...M]],
  ['/front/vendas?' + q + '&limit=3', VENDA, true],
  ['/backend/resumo?' + q, [...M, 'alertas']],
  ['/backend/total?' + q, ['backendOutros', 'callCenter', 'backendTotal', 'composicao']],
  ['/backend/por-canal?' + q, ['canal', ...M], false, true],
  ['/backend/nao-classificadas?' + q + '&limit=1', VENDA, true, true],
  ['/call-center/resumo?' + q, [...M, 'unidades', 'alertas', 'sobraOperacionalEstimadaCentavos', 'custosCentavos', 'custosPorCategoria']],
  ['/call-center/custos?' + q, ['totalCentavos', 'porCategoria', 'regrasIndisponiveis', 'metodologia']],
  ['/call-center/comissoes?' + q, ['comissaoCentavos', 'taxaCallCenterCentavos', 'observacao']],
  ['/call-center/recuperacoes?' + q, ['categoria', ...M]],
  ['/call-center/por-tipo-atendimento?' + q, ['chave', ...M]],
  ['/afiliados?' + q + '&limit=3', ['id', 'nome', 'pedidos', 'faturamentoCentavos', 'comissaoCentavos', 'comissaoOperacaoCentavos', 'reembolsosCentavos', 'ticketMedioCentavos'], true],
  ['/afiliados/resumo?' + q, [...M, 'afiliadosAtivos']],
  ['/afiliados/ranking?' + q + '&limit=3', ['posicao', 'id', 'nome', 'faturamentoCentavos']],
  ['/reembolsos/resumo?' + q, [...M, 'perdaTotalCentavos', 'pedidosComEstornoEChargeback', 'perdasSemData', 'limitacoes']],
  ['/reembolsos?' + q + '&limit=3', VENDA, true, true],
  ['/campanhas/resumo?' + q, [...M, 'vendasComCampanha', 'vendasSemCampanha']],
  ['/redtrack/conciliacao?' + q, ['vendasNoPeriodo', 'vendasComRedtrack', 'coberturaPercentual', 'conversoesSemVenda', 'porSituacao']],
  ['/redtrack/divergencias?limit=3', ['pedido', 'tipo', 'payoutCentavos', 'comissaoCentavos'], true, true],
  ['/redtrack/conversoes?limit=3', ['pedido', 'payoutCentavos', 'situacao', 'vendaId', 'sincronizadoEm'], true],
  ['/custos/resumo?' + q, ['totalLancamentosCentavos', 'porCategoria', 'ocorrencias', 'projetadas', 'pagoCentavos', 'pendenteCentavos']],
  ['/custos/categorias', ['id', 'nome', 'ativa'], false, true],
  ['/custos/recorrencias', ['id', 'periodicidade', 'inicio'], false, true],
  ['/custos?limit=3', ['id', 'descricao', 'valorCentavos', 'vencimento', 'statusPagamento', 'categoria', '_count'], true, true],
  ['/financeiro/regras-custo', ['id', 'nome', 'tipo', 'metodologia', 'ativa'], false, true],
  ['/integracoes/sheets/status', ['estado', 'dadosDesatualizados', 'ultimaSincronizacao', 'sincronizandoAgora', 'limiteDesatualizadoSegundos', 'fontes']],
  ['/integracoes/sheets/execucoes?limit=3', ['id', 'fonte', 'status', 'iniciadaEm', 'lidos', 'inseridos', 'comErro'], true],
  ['/integracoes/sheets/erros?limit=3', ['id', 'fonte', 'codigo', 'mensagem'], true, true],
  ['/integracoes/sheets/fontes', ['fonte', 'aba', 'estado', 'cursorUltimaLinha']],
  ['/classificacoes/regras', ['id', 'nome', 'campo', 'grupo', 'prioridade'], false, true],
  ['/classificacoes/pendencias?' + q, ['totalPendentes', 'agrupamentos', 'orientacao']],
  ['/usuarios?limit=3', ['id', 'nome', 'email', 'perfil', 'ativo'], true],
  ['/admin/auditoria?limit=3', ['id', 'acao', 'criadoEm'], true, true],
  ['/auth/sessions', ['id', 'ultimoUsoEm', 'atual']],
];

async function call(path, token) {
  const res = await fetch(base + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  let body = null;
  try { body = await res.json(); } catch { /* sem corpo */ }
  return { status: res.status, body };
}

const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, senha }) });
const lb = await login.json();
if (!login.ok) {
  console.error(`Login falhou (${login.status}): ${lb?.error?.code}`);
  process.exit(1);
}
const loginKeys = Object.keys(lb.data);
console.log('login ->', loginKeys.join(','), '| usuario:', Object.keys(lb.data.usuario).join(','));
const token = lb.data.accessToken;

let falhas = 0;
for (const [path, campos, paged, listaPodeVazia] of checks) {
  const { status, body } = await call(path, token);
  if (status !== 200) {
    console.log(`✗ ${status} ${path.split('?')[0]} ${body?.error?.code ?? ''}`);
    falhas++;
    continue;
  }
  const data = body?.data;
  const isList = Array.isArray(data);
  const alvo = isList ? data[0] : data;
  const meta = body?.meta ?? {};
  const problemas = [];
  if (body?.success !== true) problemas.push('success!=true');
  if (paged && !(typeof meta.page === 'number' && typeof meta.total === 'number' && typeof meta.totalPages === 'number')) problemas.push('meta de paginação ausente');
  if (isList && alvo === undefined) {
    if (!listaPodeVazia) problemas.push('lista vazia (não deu para validar campos)');
  } else if (!alvo || typeof alvo !== 'object') {
    problemas.push('data não é objeto');
  } else {
    const faltam = campos.filter((c) => !(c in alvo));
    if (faltam.length) problemas.push(`campos ausentes: ${faltam.join(', ')}`);
  }
  if (problemas.length) { falhas++; console.log(`✗ ${path.split('?')[0]} -> ${problemas.join(' | ')}`); }
  else console.log(`✓ ${path.split('?')[0]}${isList && alvo === undefined ? ' (lista vazia)' : ''}`);
}
console.log(falhas === 0 ? '\nContrato OK.' : `\n${falhas} endpoint(s) divergem do contrato esperado.`);
process.exit(falhas === 0 ? 0 : 1);
