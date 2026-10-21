import { useMutation, useQueryClient } from '@tanstack/react-query';
import { History, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { ConfirmDialog } from '@/components/forms/ConfirmDialog';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableSearch } from '@/components/tables/TableSearch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFilters } from '@/hooks/useFilters';
import { usePermissions } from '@/hooks/usePermissions';
import { usePagedReport } from '@/hooks/useReport';
import { useTableState } from '@/hooks/useTableState';
import { formatDate, formatDateTime, todaySP } from '@/lib/dates';
import { PERIODICIDADE_LABEL } from '@/lib/formatters';
import type { Params } from '@/lib/query-keys';
import { adminService } from '@/services/admin.service';
import { custosService } from '@/services/custos.service';
import { ApiError } from '@/types/api.types';
import type { Custo } from '@/types/financial.types';
import { useQuery } from '@tanstack/react-query';
import { retryPolicy } from '@/hooks/useReport';
import { AttachmentsDialog } from './AttachmentsDialog';
import { CostForm, useCategorias } from './CostForm';
import { STATUS_LABEL, STATUS_PAGAMENTO } from './cost-schemas';

const ALL = '__todos__';
const VARIANT = { PENDENTE: 'warning', PAGO: 'positive', CANCELADO: 'default' } as const;

/** Vencido = pendente com vencimento anterior a hoje (data de Brasília). */
export const isOverdue = (c: Pick<Custo, 'statusPagamento' | 'vencimento'>): boolean => c.statusPagamento === 'PENDENTE' && c.vencimento.slice(0, 10) < todaySP();

interface Props {
  id: string;
  /** parâmetros fixos (ex.: grupo=CALL_CENTER) */
  fixed?: Params;
  grupo?: string;
  title: string;
}

export function CostsTable({ id, fixed, grupo, title }: Props) {
  const { range } = useFilters();
  const { can } = usePermissions();
  const qc = useQueryClient();
  const canWrite = can('custos.write');
  const canDelete = can('custos.delete');
  const isAdmin = can('usuarios.admin');
  const { state, update } = useTableState(id, { sortBy: 'vencimento', sortOrder: 'DESC', limit: 20 });
  const [categoriaId, setCategoriaId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [editing, setEditing] = useState<Custo | null>(null);
  const [removing, setRemoving] = useState<Custo | null>(null);
  const [anexos, setAnexos] = useState<Custo | null>(null);
  const [history, setHistory] = useState<Custo | null>(null);
  const categorias = useCategorias();

  const params: Params = {
    ...fixed, de: range.de, ate: range.ate, busca: state.busca || undefined, categoriaId, status,
    page: state.page, limit: state.limit, sortBy: state.sortBy, sortOrder: state.sortOrder,
  };
  const q = usePagedReport('custos', 'lista', custosService.listar, params, { autoRefresh: false });

  const del = useMutation({
    mutationFn: (c: Custo) => custosService.remover(c.id),
    onSuccess: () => {
      toast.success('Custo excluído.');
      setRemoving(null);
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof ApiError && e.isForbidden ? 'Você não tem permissão para excluir.' : 'Não foi possível excluir o custo.'),
  });

  const columns: Column<Custo>[] = [
    { id: 'descricao', header: 'Descrição', sortable: true, sortKey: 'descricao', mobile: 'title', cell: (c) => <span className="font-medium">{c.descricao}</span> },
    { id: 'categoria', header: 'Tipo', cell: (c) => c.categoria.nome },
    { id: 'recorrencia', header: 'Recorrência', cell: (c) => (c.recorrencia ? PERIODICIDADE_LABEL[c.recorrencia.periodicidade] : 'Único') },
    { id: 'vencimento', header: 'Vencimento', sortable: true, sortKey: 'vencimento', cell: (c) => formatDate(c.vencimento) },
    { id: 'valor', header: 'Valor', align: 'right', sortable: true, sortKey: 'valorCentavos', mobile: 'value', cell: (c) => <CurrencyValue centavos={c.valorCentavos} /> },
    {
      id: 'anexos', header: 'Anexos', headerLabel: 'Anexos', mobile: 'actions',
      cell: (c) => (
        <Button variant="ghost" size="sm" className="-mx-1" onClick={() => setAnexos(c)} aria-label={`Anexos de ${c.descricao}: ${c._count.anexos}`}>
          <Paperclip /> {c._count.anexos}
        </Button>
      ),
    },
    {
      id: 'status', header: 'Status',
      cell: (c) => (isOverdue(c) ? <Badge variant="negative">Vencido</Badge> : <Badge variant={VARIANT[c.statusPagamento]}>{STATUS_LABEL[c.statusPagamento]}</Badge>),
    },
    {
      id: 'acoes', header: 'Ações', align: 'right', mobile: 'actions',
      cell: (c) => (
        <span className="no-print inline-flex gap-1">
          {canWrite && <Button variant="ghost" size="icon-sm" aria-label={`Editar ${c.descricao}`} onClick={() => setEditing(c)}><Pencil /></Button>}
          {isAdmin && <Button variant="ghost" size="icon-sm" aria-label={`Histórico de ${c.descricao}`} onClick={() => setHistory(c)}><History /></Button>}
          {canDelete && <Button variant="ghost" size="icon-sm" className="text-negative" aria-label={`Excluir ${c.descricao}`} onClick={() => setRemoving(c)}><Trash2 /></Button>}
        </span>
      ),
    },
  ];

  const meta = q.data?.meta;
  return (
    <div className="space-y-3">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <TableSearch value={state.busca} onChange={(busca) => update({ busca })} placeholder="Buscar por descrição…" label="Buscar custos por descrição" />
        <div className="sm:w-48">
          <Select value={categoriaId ?? ALL} onValueChange={(v) => { setCategoriaId(v === ALL ? undefined : v); update({ page: 1 }); }}>
            <SelectTrigger aria-label="Filtrar por tipo"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>Todos os tipos</SelectItem>{(categorias.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="sm:w-44">
          <Select value={status ?? ALL} onValueChange={(v) => { setStatus(v === ALL ? undefined : v); update({ page: 1 }); }}>
            <SelectTrigger aria-label="Filtrar por status"><SelectValue placeholder="Todos os status" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>Todos os status</SelectItem>{STATUS_PAGAMENTO.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        caption={title}
        columns={columns}
        data={q.data?.data}
        rowKey={(c) => c.id}
        loading={q.isPending}
        fetching={q.isFetching && !q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        serverSort={{ sortBy: state.sortBy, sortOrder: state.sortOrder, onChange: (sortBy, sortOrder) => update({ sortBy, sortOrder }) }}
        empty={{ title: 'Nenhum custo cadastrado para este período.', description: 'Ajuste o período (filtra pelo vencimento) ou lance um novo custo.' }}
        pagination={meta && { page: meta.page, limit: meta.limit, total: meta.total, totalPages: meta.totalPages, onPageChange: (page) => update({ page }), onLimitChange: (limit) => update({ limit }) }}
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>Editar custo</DialogTitle><DialogDescription>As alterações ficam registradas na auditoria.</DialogDescription></DialogHeader>
          {editing && <CostForm initial={editing} grupo={grupo} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Excluir este custo?"
        description={`"${removing?.descricao ?? ''}" e seus anexos serão removidos definitivamente.`}
        confirmLabel="Excluir"
        destructive
        loading={del.isPending}
        onConfirm={() => removing && del.mutate(removing)}
      />

      <AttachmentsDialog custo={anexos} canWrite={canWrite} onOpenChange={(o) => !o && setAnexos(null)} />
      <HistoryDialog custo={history} onOpenChange={(o) => !o && setHistory(null)} />
    </div>
  );
}

function HistoryDialog({ custo, onOpenChange }: { custo: Custo | null; onOpenChange: (o: boolean) => void }) {
  const h = useQuery({
    queryKey: ['custos', custo?.id, 'historico'],
    enabled: !!custo,
    retry: retryPolicy,
    queryFn: async ({ signal }) => (await adminService.auditoria({ acao: 'custo.', limit: 100 }, signal)).data.filter((a) => a.entidadeId === custo?.id),
  });
  return (
    <Dialog open={!!custo} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Histórico</DialogTitle><DialogDescription>{custo?.descricao}</DialogDescription></DialogHeader>
        <ul className="space-y-1.5 text-[13px]">
          {(h.data ?? []).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2">
              <Badge>{a.acao.replace('custo.', '')}</Badge>
              <span className="text-muted-foreground">{formatDateTime(a.criadoEm)}</span>
              <span>{a.usuario?.nome ?? 'sistema'}</span>
            </li>
          ))}
          {!h.isPending && (h.data?.length ?? 0) === 0 && <li className="text-xs text-muted-foreground">Nenhum registro de alteração.</li>}
          {h.isPending && <li className="text-xs text-muted-foreground">Carregando…</li>}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
