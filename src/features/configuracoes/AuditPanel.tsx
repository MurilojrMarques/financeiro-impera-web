import { useState } from 'react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableSearch } from '@/components/tables/TableSearch';
import { Badge } from '@/components/ui/badge';
import { usePagedReport } from '@/hooks/useReport';
import { useTableState } from '@/hooks/useTableState';
import { formatDateTime } from '@/lib/dates';
import { adminService } from '@/services/admin.service';
import type { AuditoriaItem } from '@/types/financial.types';

export function AuditPanel() {
  const { state, update } = useTableState('aud', { limit: 20 });
  const [acao, setAcao] = useState('');
  const q = usePagedReport('admin', 'auditoria', adminService.auditoria, { page: state.page, limit: state.limit, acao: acao || undefined }, { autoRefresh: false });

  const cols: Column<AuditoriaItem>[] = [
    { id: 'em', header: 'Quando', cell: (a) => formatDateTime(a.criadoEm) },
    { id: 'acao', header: 'Ação', cell: (a) => <Badge>{a.acao}</Badge> },
    { id: 'usr', header: 'Usuário', cell: (a) => a.usuario?.nome ?? 'sistema' },
    { id: 'ent', header: 'Entidade', cell: (a) => (a.entidade ? `${a.entidade}${a.entidadeId ? ` · ${a.entidadeId.slice(0, 8)}…` : ''}` : '—') },
    { id: 'ip', header: 'IP', cell: (a) => <span className="text-xs text-muted-foreground">{a.ip ?? '—'}</span> },
  ];
  const meta = q.data?.meta;

  return (
    <div className="space-y-3">
      <TableSearch value={acao} onChange={(v) => { setAcao(v); update({ page: 1 }); }} placeholder="Filtrar por prefixo da ação (ex.: custo.)" label="Filtrar auditoria por ação" />
      <DataTable
        caption="Trilha de auditoria" columns={cols} data={q.data?.data} rowKey={(a) => a.id} loading={q.isPending} fetching={q.isFetching && !q.isPending}
        error={q.error} onRetry={() => void q.refetch()} dense empty={{ title: 'Nenhum registro de auditoria.' }}
        pagination={meta && { page: meta.page, limit: meta.limit, total: meta.total, totalPages: meta.totalPages, onPageChange: (page) => update({ page }), onLimitChange: (limit) => update({ limit }) }}
      />
      <p className="text-[11px] text-muted-foreground">Senhas, tokens e hashes nunca são registrados na auditoria.</p>
    </div>
  );
}
