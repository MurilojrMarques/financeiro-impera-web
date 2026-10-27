import type { RhPapel } from '@/types/auth.types';

/** Dados falsos e determinísticos do módulo de RH (nenhuma chamada sai da máquina). Valores em centavos. */
interface Reply { data: unknown; meta?: Record<string, unknown>; status?: number; noContent?: boolean }

const PESSOAS = [
  { id: 'c-gestora', nome: 'Gestora Exemplo', funcao: 'Líder de Copy', cargoBase: 'Copy', departamento: 'Copy', senioridade: 'sr', subnivel: 2, gestorId: null, salario: 800_000 },
  { id: 'c-ana', nome: 'Ana Caroliny da Silva Andrade', funcao: 'Editor Pl', cargoBase: 'Editor', departamento: 'Edição', senioridade: 'pl', subnivel: 1, gestorId: 'c-gestora', salario: 400_000 },
  { id: 'c-bruno', nome: 'Bruno Henrique Souza', funcao: 'Copy Sr', cargoBase: 'Copy', departamento: 'Copy', senioridade: 'sr', subnivel: 1, gestorId: 'c-gestora', salario: 650_000 },
  { id: 'c-carla', nome: 'Carla Menezes', funcao: 'Analista de Pós Venda Jr', cargoBase: 'Analista de Pós Venda', departamento: 'CS', senioridade: 'jr', subnivel: null, gestorId: null, salario: 200_000 },
];

const nomeGestor = (id: string | null) => (id ? { id, nome: PESSOAS.find((p) => p.id === id)!.nome } : null);

function colaborador(p: (typeof PESSOAS)[number], papel: RhPapel, meuId: string) {
  const proprio = p.id === meuId;
  const veTudo = papel === 'RH' || papel === 'CEO';
  return {
    id: p.id, nome: p.nome, email: `${p.id}@impera.com`, celular: '(31) 99999-0000', camiseta: 'M', departamento: p.departamento,
    cargoBase: p.cargoBase, funcao: p.funcao, tipoCargo: 'operacional', senioridade: p.senioridade, subnivel: p.subnivel,
    gestor: nomeGestor(p.gestorId), gestorId: p.gestorId, inicio: '2026-03-02T00:00:00.000Z', demissao: null, ativo: true, foto: null,
    ...(veTudo || proprio ? { nascimento: '1992-05-14T00:00:00.000Z', cnpj: '12.345.678/0001-90', endereco: 'Rua das Flores, 100 - Belo Horizonte/MG', contratoObs: 'ok' } : {}),
    ...(veTudo || proprio ? { salarioCentavos: p.salario } : {}),
  };
}

const FOLHA_ITENS = PESSOAS.map((p, i) => {
  const dias = p.id === 'c-carla' ? 22 : 30;
  const salario = Math.round((p.salario * dias) / 30);
  const comissao = i === 1 ? 50_000 : 0;
  return {
    id: `i-${p.id}`, colaboradorId: p.id, salarioMensalCentavos: p.salario, diasTrabalhados: dias, salarioCentavos: salario,
    comissaoCentavos: comissao, bonusCentavos: 0, descontoCentavos: 0, totalCentavos: salario + comissao,
    status: i === 0 ? 'PAGO' : 'PENDENTE', pagoEm: i === 0 ? '2026-11-05T00:00:00.000Z' : null, obs: null,
    colaborador: { id: p.id, nome: p.nome, departamento: p.departamento, funcao: p.funcao, cnpj: '12.345.678/0001-90' },
  };
});
const soma = (f: (i: (typeof FOLHA_ITENS)[number]) => number) => FOLHA_ITENS.reduce((s, i) => s + f(i), 0);
const RESUMO = {
  pessoas: FOLHA_ITENS.length, salariosCentavos: soma((i) => i.salarioCentavos), salariosMensaisCentavos: soma((i) => i.salarioMensalCentavos),
  comissoesCentavos: soma((i) => i.comissaoCentavos), bonusCentavos: 0, descontosCentavos: 0, totalCentavos: soma((i) => i.totalCentavos),
  pagoCentavos: soma((i) => (i.status === 'PAGO' ? i.totalCentavos : 0)), pendenteCentavos: soma((i) => (i.status === 'PENDENTE' ? i.totalCentavos : 0)),
};

const DOCS = [
  { id: 'd1', colaboradorId: 'c-ana', tipo: 'NOTA_FISCAL', competencia: '2026-10', valorCentavos: 450_000, descricao: null, arquivoNome: 'NF-102-outubro.pdf', mime: 'application/pdf', tamanhoBytes: 183_000, status: 'ENVIADO', motivoReprovacao: null, criadoEm: '2026-10-28T13:00:00.000Z', colaborador: { nome: 'Ana Caroliny da Silva Andrade' } },
  { id: 'd2', colaboradorId: 'c-ana', tipo: 'COMPROVANTE_PAGAMENTO', competencia: '2026-09', valorCentavos: 400_000, descricao: null, arquivoNome: 'comprovante-set.pdf', mime: 'application/pdf', tamanhoBytes: 92_000, status: 'APROVADO', motivoReprovacao: null, criadoEm: '2026-10-05T10:00:00.000Z', colaborador: { nome: 'Ana Caroliny da Silva Andrade' } },
  { id: 'd3', colaboradorId: 'c-bruno', tipo: 'NOTA_FISCAL', competencia: '2026-10', valorCentavos: 650_000, descricao: null, arquivoNome: 'nf-bruno.png', mime: 'image/png', tamanhoBytes: 540_000, status: 'REPROVADO', motivoReprovacao: 'Valor diferente da folha', criadoEm: '2026-10-27T09:00:00.000Z', colaborador: { nome: 'Bruno Henrique Souza' } },
];

export function handleRh(path: string, papel: RhPapel, meuId: string): Reply | null {
  const veTudo = papel === 'RH' || papel === 'CEO';
  const visiveis = papel === 'COLABORADOR' ? PESSOAS.filter((x) => x.id === meuId) : papel === 'GESTOR' ? PESSOAS.filter((x) => x.id === meuId || x.gestorId === meuId) : PESSOAS;
  const pg = (itens: unknown[]) => ({ data: itens, meta: { page: 1, limit: 20, total: itens.length, totalPages: 1 } });

  if (path === '/rh/colaboradores/eu') return { data: { papel, colaborador: colaborador(PESSOAS.find((x) => x.id === meuId)!, papel, meuId) } };
  if (path === '/rh/colaboradores/painel') {
    if (!veTudo) return { status: 403, data: null };
    const total = PESSOAS.reduce((s, x) => s + x.salario, 0);
    return {
      data: {
        ativos: PESSOAS.length, desligados: 11, folhaMensalCentavos: total, mediaSalarialCentavos: Math.round(total / PESSOAS.length), baseDaFolha: 'SALARIO',
        porDepartamento: [
          { nome: 'Copy', quantidade: 2, folhaCentavos: 1_450_000, mediaCentavos: 725_000 },
          { nome: 'Edição', quantidade: 1, folhaCentavos: 400_000, mediaCentavos: 400_000 },
          { nome: 'CS', quantidade: 1, folhaCentavos: 200_000, mediaCentavos: 200_000 },
        ],
        porSenioridade: [{ nome: 'sr', quantidade: 2, folhaCentavos: 1_450_000, mediaCentavos: 725_000 }, { nome: 'pl', quantidade: 1, folhaCentavos: 400_000, mediaCentavos: 400_000 }, { nome: 'jr', quantidade: 1, folhaCentavos: 200_000, mediaCentavos: 200_000 }],
        ultimos90Dias: { movimentacoes: 5, promocoes: 2, reajustes: 3, aumentoMensalCentavos: 320_000 },
      },
    };
  }
  let m = /^\/rh\/colaboradores\/([^/]+)\/movimentacoes$/.exec(path);
  if (m) {
    if (!(veTudo || m[1] === meuId)) return { status: 403, data: null };
    return { data: [
      { id: 'm2', tipo: 'PROMOCAO', data: '2026-09-01T00:00:00.000Z', cargoAnterior: 'Editor Jr', cargoNovo: 'Editor Pl', departamentoAnterior: 'Edição', departamentoNovo: 'Edição', senioridadeAnterior: 'jr', senioridadeNova: 'pl', salarioAnteriorCentavos: 300_000, salarioNovoCentavos: 400_000, obs: 'Promoção por desempenho' },
      { id: 'm1', tipo: 'REAJUSTE', data: '2026-06-01T00:00:00.000Z', cargoAnterior: 'Editor Jr', cargoNovo: 'Editor Jr', departamentoAnterior: 'Edição', departamentoNovo: 'Edição', senioridadeAnterior: 'jr', senioridadeNova: 'jr', salarioAnteriorCentavos: 260_000, salarioNovoCentavos: 300_000, obs: null },
    ] };
  }
  m = /^\/rh\/colaboradores\/([^/]+)$/.exec(path);
  if (m) {
    const x = visiveis.find((v) => v.id === m![1]);
    return x ? { data: { ...colaborador(x, papel, meuId), tamanhoDaEquipe: x.id === 'c-gestora' ? 2 : 0 } } : { status: 404, data: null };
  }
  if (path === '/rh/colaboradores') return pg(visiveis.map((x) => colaborador(x, papel, meuId)));

  if (path === '/rh/folha') return veTudo ? { data: [{ competencia: '2026-10', status: 'ABERTA', fechadaEm: null, ...RESUMO }, { competencia: '2026-09', status: 'FECHADA', fechadaEm: '2026-10-06T12:00:00.000Z', ...RESUMO }] } : { status: 403, data: null };
  m = /^\/rh\/folha\/(\d{4}-\d{2})$/.exec(path);
  if (m) {
    if (!veTudo) return { status: 403, data: null };
    return m[1] === '2026-10' ? { data: { competencia: '2026-10', status: 'ABERTA', fechadaEm: null, resumo: RESUMO, itens: FOLHA_ITENS } } : { status: 404, data: null };
  }

  if (path === '/rh/documentos/resumo') {
    if (!veTudo) return { status: 403, data: null };
    const nota = (id: string) => { const d = DOCS.find((x) => x.colaboradorId === id && x.tipo === 'NOTA_FISCAL'); return d ? { id: d.id, status: d.status, valorCentavos: d.valorCentavos, arquivoNome: d.arquivoNome, motivoReprovacao: d.motivoReprovacao, criadoEm: d.criadoEm } : null; };
    const itens = PESSOAS.map((p) => ({ colaboradorId: p.id, nome: p.nome, departamento: p.departamento, funcao: p.funcao, nota: nota(p.id), quantidadeNotas: nota(p.id) ? 1 : 0, comprovante: DOCS.some((d) => d.colaboradorId === p.id && d.tipo === 'COMPROVANTE_PAGAMENTO') }));
    const com = itens.filter((i) => i.nota);
    return { data: { competencia: '2026-10', totais: { colaboradores: itens.length, comNota: com.length, semNota: itens.length - com.length, aprovadas: com.filter((i) => i.nota!.status === 'APROVADO').length, aguardandoRevisao: com.filter((i) => i.nota!.status === 'ENVIADO').length, reprovadas: com.filter((i) => i.nota!.status === 'REPROVADO').length, valorNotasCentavos: com.reduce((s, i) => s + (i.nota!.valorCentavos ?? 0), 0) }, itens } };
  }
  if (path === '/rh/documentos') return pg(veTudo ? DOCS : DOCS.filter((d) => d.colaboradorId === meuId));

  if (path === '/rh/monitoramento') {
    if (!veTudo) return { status: 403, data: null };
    return { data: {
      monitoramentoLigado: true, intervaloMinutos: 5, ultimaVerificacaoEm: '2026-10-28T15:00:00.000Z', ultimoStatus: 'SUCESSO', ultimoErro: null, falhasSeguidas: 0, atrasado: false,
      minutosDesdeAUltimaVerificacao: 2, origem: { salvaEm: '2026-10-28T12:51:08.000Z', salvaPor: 'gabriel.silva' },
      ultimaSincronizacao: { id: 's1', em: '2026-10-28T12:52:00.000Z', alteracoes: 2, novos: 0, atualizados: 1 },
      inconsistenciasNaOrigem: [], alteracoesUltimos30Dias: { SALARIO: 3, MOVIMENTACAO: 3, CARGO: 2 },
    } };
  }
  if (path === '/rh/alteracoes') {
    return veTudo ? pg([
      { id: 'a1', tipo: 'SALARIO', campo: 'salario', anterior: '400000', novo: '450000', detectadaEm: '2026-10-28T12:52:00.000Z', colaborador: { id: 'c-ana', nome: 'Ana Caroliny da Silva Andrade' } },
      { id: 'a2', tipo: 'CARGO', campo: 'funcao', anterior: 'Editor Pl', novo: 'Editor Sr', detectadaEm: '2026-10-28T12:52:00.000Z', colaborador: { id: 'c-ana', nome: 'Ana Caroliny da Silva Andrade' } },
      { id: 'a3', tipo: 'DESLIGAMENTO', campo: 'demissao', anterior: null, novo: '2026-10-31', detectadaEm: '2026-10-20T09:00:00.000Z', colaborador: { id: 'c-carla', nome: 'Carla Menezes' } },
    ]) : { status: 403, data: null };
  }
  return null;
}
