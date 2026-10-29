import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { Notice } from '@/components/feedback/Notice';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableSearch } from '@/components/tables/TableSearch';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/segmented';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { usePagedReport, retryPolicy } from '@/hooks/useReport';
import { useTableState } from '@/hooks/useTableState';
import { useUrlSearchParams } from '@/hooks/useUrlSearchParams';
import { rhService } from '@/services/rh.service';
import type { RhColaborador } from '@/types/rh.types';
import { Avatar } from './Avatar';
import { PixCelula } from './Pix';
import { dia, senioridadeLabel } from './rh-format';

type Situacao = 'ativos' | 'desligados' | 'todos';
const TODOS = '__todos__';

/**
 * Colaboradores. O que cada pessoa enxerga vem decidido pela API: RH/CEO veem todos com salário; o gestor, só a equipe (sem salário);
 * o colaborador, só o próprio cadastro.
 */
export default function ColaboradoresPage() {
  const navigate = useNavigate();
  const { rhCan, rhPapel } = usePermissions();
  const verSalario = rhCan('salario.ver');
  const { state, update } = useTableState('colab', { limit: 20 });
  const { sp, update: updateUrl } = useUrlSearchParams();
  const situacao = (['ativos', 'desligados', 'todos'].includes(sp.get('situacao') ?? '') ? sp.get('situacao') : 'ativos') as Situacao;
  const departamento = sp.get('departamento') ?? '';

  const params = { page: state.page, limit: state.limit, busca: state.busca || undefined, departamento: departamento || undefined, ativo: situacao === 'todos' ? undefined : situacao === 'ativos' };
  const q = usePagedReport('rh', 'colaboradores', rhService.colaboradores, params, { autoRefresh: false });

  // departamentos existentes (a lista completa é pequena; serve só para montar o filtro)
  const deptos = useQuery({
    queryKey: ['rh', 'departamentos'],
    staleTime: 10 * 60_000,
    retry: retryPolicy,
    queryFn: async ({ signal }) => {
      const r = await rhService.colaboradores({ limit: 100 }, signal);
      return [...new Set(r.data.map((c) => c.departamento))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
  });

  const setFiltro = (k: string, v: string | null) => {
    updateUrl((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set(k, v);
      else next.delete(k);
      next.delete('colab.page');
      return next;
    });
  };

  const cols = useMemo<Column<RhColaborador>[]>(
    () => [
      {
        id: 'nome',
        header: 'Colaborador',
        mobile: 'title',
        cell: (c) => (
          <span className="flex items-center gap-2.5">
            <Avatar id={c.id} nome={c.nome} tem={!!c.foto} />
            <span className="min-w-0">
              <span className="block truncate font-medium">{c.nome}</span>
              <span className="block truncate text-xs text-muted-foreground">{c.funcao ?? c.cargoBase ?? '—'}</span>
            </span>
          </span>
        ),
      },
      { id: 'depto', header: 'Departamento', cell: (c) => c.departamento },
      { id: 'nivel', header: 'Nível', cell: (c) => senioridadeLabel(c.senioridade) },
      { id: 'gestor', header: 'Gestor', mobile: 'hidden', cell: (c) => c.gestor?.nome ?? '—' },
      { id: 'inicio', header: 'Início', cell: (c) => dia(c.inicio) },
      ...(verSalario
        ? [{ id: 'salario', header: 'Salário', align: 'right' as const, mobile: 'value' as const, cell: (c: RhColaborador) => <CurrencyValue centavos={c.salarioCentavos} /> }]
        : []),
      ...(verSalario ? [{ id: 'pix', header: 'PIX', mobile: 'full' as const, cell: (c: RhColaborador) => <PixCelula pix={c.pix} nome={c.nome} /> }] : []),
      { id: 'status', header: 'Situação', cell: (c) => (c.ativo ? <Badge variant="positive">Ativo</Badge> : <Badge title={c.demissao ? `Desligado em ${dia(c.demissao)}` : undefined}>Desligado</Badge>) },
    ],
    [verSalario],
  );

  const meta = q.data?.meta;
  const titulo = rhPapel === 'GESTOR' ? 'Minha equipe' : 'Colaboradores';

  return (
    <>
      <PageHeader
        title={titulo}
        description={rhPapel === 'GESTOR' ? 'As pessoas que respondem a você, diretamente ou por outros gestores. Salários não são exibidos.' : 'Cadastro vindo do sistema de RH. Clique em uma pessoa para ver a ficha.'}
      />
      {verSalario && <Notice tone="info">Os cadastros e salários são mantidos no sistema de RH; aqui você só consulta.</Notice>}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TableSearch value={state.busca} onChange={(busca) => update({ busca })} placeholder="Buscar por nome, cargo ou e-mail…" label="Buscar colaborador" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Segmented<Situacao>
            label="Situação"
            value={situacao}
            onChange={(v) => setFiltro('situacao', v === 'ativos' ? null : v)}
            options={[{ value: 'ativos', label: 'Ativos' }, { value: 'desligados', label: 'Desligados' }, { value: 'todos', label: 'Todos' }]}
          />
          {rhPapel === 'RH' || rhPapel === 'CEO' ? (
            <Select value={departamento || TODOS} onValueChange={(v) => setFiltro('departamento', v === TODOS ? null : v)}>
              <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Departamento"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os departamentos</SelectItem>
                {(deptos.data ?? []).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      <DataTable
        caption="Colaboradores"
        columns={cols}
        data={q.data?.data}
        rowKey={(c) => c.id}
        loading={q.isPending}
        fetching={q.isFetching && !q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        onRowClick={(c) => navigate(`/rh/colaboradores/${c.id}`)}
        dense
        empty={{ title: 'Nenhum colaborador encontrado.', description: 'Ajuste a busca ou a situação.' }}
        pagination={meta && { page: meta.page, limit: meta.limit, total: meta.total, totalPages: meta.totalPages, onPageChange: (page) => update({ page }), onLimitChange: (limit) => update({ limit }) }}
      />
    </>
  );
}
