import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableSearch } from '@/components/tables/TableSearch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { usePagedReport } from '@/hooks/useReport';
import { useTableState } from '@/hooks/useTableState';
import { formatDateTime } from '@/lib/dates';
import { adminService } from '@/services/admin.service';
import { ApiError } from '@/types/api.types';
import type { Perfil, UsuarioAdmin } from '@/types/auth.types';

const PERFIS: Perfil[] = ['ADMIN', 'FINANCEIRO', 'ANALISTA', 'LEITURA'];
const schema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome').max(120),
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  perfil: z.enum(['ADMIN', 'FINANCEIRO', 'ANALISTA', 'LEITURA']),
  senhaTemporaria: z.string().min(12, 'Mínimo de 12 caracteres').regex(/[A-Za-z]/, 'Inclua letras').regex(/\d/, 'Inclua números'),
});
type Form = z.infer<typeof schema>;

export function UsersPanel() {
  const qc = useQueryClient();
  const { user: eu } = useAuth();
  const { state, update } = useTableState('usr', { limit: 20 });
  const [novo, setNovo] = useState(false);
  const q = usePagedReport('usuarios', 'lista', adminService.usuarios, { page: state.page, limit: state.limit, busca: state.busca || undefined }, { autoRefresh: false });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { nome: '', email: '', perfil: 'LEITURA', senhaTemporaria: '' } });
  const criar = useMutation({
    mutationFn: (v: Form) => adminService.criarUsuario(v),
    onSuccess: () => { toast.success('Usuário criado. A senha temporária deve ser trocada no primeiro acesso.'); setNovo(false); reset(); void qc.invalidateQueries({ queryKey: ['usuarios'] }); },
    onError: (e) => toast.error(e instanceof ApiError && (e.status === 409 || e.status === 422) ? e.message : 'Não foi possível criar o usuário.'),
  });
  const status = useMutation({
    mutationFn: (v: { id: string; ativo: boolean }) => adminService.atualizarStatus(v.id, v.ativo),
    onSuccess: () => { toast.success('Status atualizado.'); void qc.invalidateQueries({ queryKey: ['usuarios'] }); },
    onError: (e) => toast.error(e instanceof ApiError && e.status === 409 ? e.message : 'Não foi possível alterar o status.'),
  });
  const perfil = useMutation({
    mutationFn: (v: { id: string; perfil: Perfil }) => adminService.atualizarPerfil(v.id, v.perfil),
    onSuccess: () => { toast.success('Perfil atualizado.'); void qc.invalidateQueries({ queryKey: ['usuarios'] }); },
    onError: (e) => toast.error(e instanceof ApiError && e.status === 409 ? e.message : 'Não foi possível alterar o perfil.'),
  });

  const cols: Column<UsuarioAdmin>[] = [
    { id: 'nome', header: 'Nome', mobile: 'title', cell: (u) => <span className="font-medium">{u.nome}</span> },
    { id: 'email', header: 'E-mail', mobile: 'full', cell: (u) => u.email },
    {
      id: 'perfil', header: 'Perfil',
      cell: (u) => (
        <Select value={u.perfil} onValueChange={(p) => perfil.mutate({ id: u.id, perfil: p as Perfil })} disabled={u.id === eu?.id || perfil.isPending}>
          <SelectTrigger className="h-8 w-36 text-xs" aria-label={`Perfil de ${u.nome}`}><SelectValue /></SelectTrigger>
          <SelectContent>{PERFIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      ),
    },
    { id: 'status', header: 'Status', mobile: 'value', cell: (u) => (u.ativo ? <Badge variant="positive">Ativo</Badge> : <Badge>Inativo</Badge>) },
    { id: 'troca', header: 'Senha', cell: (u) => (u.trocaSenhaObrig ? <Badge variant="warning">temporária</Badge> : '—') },
    { id: 'login', header: 'Último acesso', cell: (u) => formatDateTime(u.ultimoLoginEm) },
    {
      id: 'acoes', header: 'Ações', align: 'right', mobile: 'actions',
      cell: (u) => (u.id === eu?.id ? <span className="text-xs text-muted-foreground">você</span> : (
        <Button variant="ghost" size="sm" disabled={status.isPending} onClick={() => status.mutate({ id: u.id, ativo: !u.ativo })}>{u.ativo ? 'Desativar' : 'Reativar'}</Button>
      )),
    },
  ];
  const meta = q.data?.meta;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TableSearch value={state.busca} onChange={(busca) => update({ busca })} placeholder="Buscar usuário…" label="Buscar usuário" />
        <Button onClick={() => setNovo(true)} className="max-sm:w-full"><Plus /> Novo usuário</Button>
      </div>
      <DataTable
        caption="Usuários" columns={cols} data={q.data?.data} rowKey={(u) => u.id} loading={q.isPending} fetching={q.isFetching && !q.isPending}
        error={q.error} onRetry={() => void q.refetch()} dense empty={{ title: 'Nenhum usuário encontrado.' }}
        pagination={meta && { page: meta.page, limit: meta.limit, total: meta.total, totalPages: meta.totalPages, onPageChange: (page) => update({ page }), onLimitChange: (limit) => update({ limit }) }}
      />
      <p className="text-[11px] text-muted-foreground">Usuários não são excluídos: a desativação preserva o histórico de auditoria e encerra as sessões.</p>

      <Dialog open={novo} onOpenChange={setNovo}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo usuário</DialogTitle><DialogDescription>A conta é criada com senha temporária; a troca é obrigatória no primeiro acesso.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit((v) => criar.mutate(v))} noValidate className="space-y-3">
            <div className="space-y-1"><Label htmlFor="u-nome">Nome</Label><Input id="u-nome" aria-invalid={!!errors.nome} {...register('nome')} />{errors.nome && <p role="alert" className="text-xs text-negative">{errors.nome.message}</p>}</div>
            <div className="space-y-1"><Label htmlFor="u-email">E-mail</Label><Input id="u-email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...register('email')} />{errors.email && <p role="alert" className="text-xs text-negative">{errors.email.message}</p>}</div>
            <div className="space-y-1">
              <Label htmlFor="u-perfil">Perfil</Label>
              <Controller control={control} name="perfil" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="u-perfil"><SelectValue /></SelectTrigger><SelectContent>{PERFIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              )} />
            </div>
            <div className="space-y-1"><Label htmlFor="u-senha">Senha temporária</Label><Input id="u-senha" type="password" autoComplete="new-password" aria-invalid={!!errors.senhaTemporaria} {...register('senhaTemporaria')} />{errors.senhaTemporaria && <p role="alert" className="text-xs text-negative">{errors.senhaTemporaria.message}</p>}</div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setNovo(false)}>Cancelar</Button><Button type="submit" disabled={criar.isPending}>{criar.isPending && <LoaderCircle className="animate-spin" />} Criar usuário</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
