import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { authConfig } from '@/services/auth.service';
import { ApiError } from '@/types/api.types';
import type { Perfil, UsuarioAdmin } from '@/types/auth.types';

const PERFIS: Perfil[] = ['ADMIN', 'FINANCEIRO', 'ANALISTA', 'LEITURA'];
const schema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome').max(120),
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  perfil: z.enum(['ADMIN', 'FINANCEIRO', 'ANALISTA', 'LEITURA']),
  /** só quando o servidor não tem e-mail configurado (sem convite): a troca é obrigatória no primeiro acesso */
  senhaTemporaria: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function UsersPanel() {
  const qc = useQueryClient();
  const { user: eu } = useAuth();
  const { state, update } = useTableState('usr', { limit: 20 });
  const [novo, setNovo] = useState(false);
  const config = useQuery({ queryKey: ['auth-config'], queryFn: async () => (await authConfig()).data, staleTime: 300_000, retry: false });
  const comEmail = config.data?.recuperacaoSenha ?? true;
  const q = usePagedReport('usuarios', 'lista', adminService.usuarios, { page: state.page, limit: state.limit, busca: state.busca || undefined }, { autoRefresh: false });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { nome: '', email: '', perfil: 'LEITURA', senhaTemporaria: '' } });
  const criar = useMutation({
    mutationFn: (v: Form) => adminService.criarUsuario({ nome: v.nome, email: v.email, perfil: v.perfil, ...(!comEmail && v.senhaTemporaria ? { senhaTemporaria: v.senhaTemporaria } : {}) }),
    onSuccess: (r) => {
      toast.success(!r.data.conviteEnviado && !comEmail ? 'Usuário criado com senha temporária: a troca é obrigatória no primeiro acesso.' : r.data.conviteEnviado ? `Convite enviado para ${r.data.email}. O usuário define a própria senha pelo link.` : 'Usuário criado, mas o e-mail do convite não pôde ser enviado. Use "Reenviar convite".');
      setNovo(false);
      reset();
      void qc.invalidateQueries({ queryKey: ['usuarios'] });
    },
    onError: (e) => toast.error(e instanceof ApiError && [409, 422, 503].includes(e.status ?? 0) ? e.message : 'Não foi possível criar o usuário.'),
  });
  const useAcao = (rotulo: string, fn: (id: string) => Promise<unknown>) =>
    useMutation({
      mutationFn: (id: string) => fn(id),
      onSuccess: () => { toast.success(rotulo); void qc.invalidateQueries({ queryKey: ['usuarios'] }); },
      onError: (e) => toast.error(e instanceof ApiError && [409, 503].includes(e.status ?? 0) ? e.message : 'Não foi possível concluir a ação.'),
    });
  const reenviar = useAcao('Convite reenviado. O link anterior deixou de valer.', (id) => adminService.reenviarConvite(id));
  const redefinir = useAcao('Link de redefinição enviado ao usuário por e-mail.', (id) => adminService.enviarRedefinicao(id));
  const desbloquear = useAcao('Usuário desbloqueado.', (id) => adminService.desbloquearUsuario(id));
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
    {
      id: 'conta', header: 'Conta',
      cell: (u) => {
        const bloqueado = !!u.bloqueadoAte && new Date(u.bloqueadoAte) > new Date();
        return (
          <span className="flex flex-wrap gap-1">
            {u.convitePendente && <Badge variant="info" title="O convite foi enviado e ainda não foi aceito">convite pendente</Badge>}
            {u.trocaSenhaObrig && <Badge variant="warning">senha temporária</Badge>}
            {bloqueado && <Badge variant="negative" title={`Bloqueada por tentativas de login até ${formatDateTime(u.bloqueadoAte)}`}>bloqueada</Badge>}
            {!u.convitePendente && !u.trocaSenhaObrig && !bloqueado && '—'}
          </span>
        );
      },
    },
    { id: 'login', header: 'Último acesso', cell: (u) => formatDateTime(u.ultimoLoginEm) },
    {
      id: 'acoes', header: 'Ações', align: 'right', mobile: 'actions',
      cell: (u) => {
        if (u.id === eu?.id) return <span className="text-xs text-muted-foreground">você</span>;
        const bloqueado = !!u.bloqueadoAte && new Date(u.bloqueadoAte) > new Date();
        return (
          <span className="flex flex-wrap justify-end gap-1">
            {u.ativo && u.convitePendente && <Button variant="ghost" size="sm" disabled={reenviar.isPending} onClick={() => reenviar.mutate(u.id)}>Reenviar convite</Button>}
            {u.ativo && !u.convitePendente && <Button variant="ghost" size="sm" disabled={redefinir.isPending} onClick={() => redefinir.mutate(u.id)} title="Envia ao usuário um link para criar nova senha">Redefinir senha</Button>}
            {bloqueado && <Button variant="ghost" size="sm" disabled={desbloquear.isPending} onClick={() => desbloquear.mutate(u.id)}>Desbloquear</Button>}
            <Button variant="ghost" size="sm" disabled={status.isPending} onClick={() => status.mutate({ id: u.id, ativo: !u.ativo })}>{u.ativo ? 'Desativar' : 'Reativar'}</Button>
          </span>
        );
      },
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
          <DialogHeader><DialogTitle>Novo usuário</DialogTitle><DialogDescription>{comEmail ? 'O usuário recebe um convite por e-mail e define a própria senha: você nunca vê nem informa a senha dele. O link vale por 72 horas.' : 'O envio de e-mail não está configurado no servidor: a conta é criada com uma senha temporária e a troca é obrigatória no primeiro acesso.'}</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit((v) => { if (!comEmail && !(v.senhaTemporaria && v.senhaTemporaria.length >= 12 && /[A-Za-z]/.test(v.senhaTemporaria) && /\d/.test(v.senhaTemporaria))) { toast.error('Informe uma senha temporária com 12+ caracteres, letras e números.'); return; } criar.mutate(v); })} noValidate className="space-y-3">
            <div className="space-y-1"><Label htmlFor="u-nome">Nome</Label><Input id="u-nome" aria-invalid={!!errors.nome} {...register('nome')} />{errors.nome && <p role="alert" className="text-xs text-negative">{errors.nome.message}</p>}</div>
            <div className="space-y-1"><Label htmlFor="u-email">E-mail</Label><Input id="u-email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...register('email')} />{errors.email && <p role="alert" className="text-xs text-negative">{errors.email.message}</p>}</div>
            <div className="space-y-1">
              <Label htmlFor="u-perfil">Perfil</Label>
              <Controller control={control} name="perfil" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="u-perfil"><SelectValue /></SelectTrigger><SelectContent>{PERFIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              )} />
            </div>
            {!comEmail && <div className="space-y-1"><Label htmlFor="u-senha">Senha temporária</Label><Input id="u-senha" type="password" autoComplete="new-password" {...register('senhaTemporaria')} /></div>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setNovo(false)}>Cancelar</Button><Button type="submit" disabled={criar.isPending}>{criar.isPending && <LoaderCircle className="animate-spin" />} {comEmail ? 'Enviar convite' : 'Criar usuário'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
