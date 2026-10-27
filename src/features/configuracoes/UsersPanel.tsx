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
import { rhService } from '@/services/rh.service';
import type { Perfil, RhPapel, UsuarioAdmin } from '@/types/auth.types';

/** SEM_FINANCEIRO = colaborador: entra só no módulo de RH, sem nenhuma tela do financeiro. */
const PERFIS: Perfil[] = ['ADMIN', 'FINANCEIRO', 'ANALISTA', 'LEITURA', 'SEM_FINANCEIRO'];
const PERFIL_LABEL: Record<Perfil, string> = { ADMIN: 'ADMIN', FINANCEIRO: 'FINANCEIRO', ANALISTA: 'ANALISTA', LEITURA: 'LEITURA', SEM_FINANCEIRO: 'COLABORADOR (só RH)' };
const RH_PAPEIS: RhPapel[] = ['RH', 'CEO', 'GESTOR', 'COLABORADOR'];
const RH_LABEL: Record<RhPapel, string> = { RH: 'RH', CEO: 'CEO', GESTOR: 'Gestor', COLABORADOR: 'Colaborador' };
const SEM_RH = '__sem_rh__';
const schema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome').max(120),
  email: z.string().trim().email('E-mail inválido').or(z.literal('')),
  usuario: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,31}$/, 'Use 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado').or(z.literal('')),
  perfil: z.enum(['ADMIN', 'FINANCEIRO', 'ANALISTA', 'LEITURA', 'SEM_FINANCEIRO']),
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

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { nome: '', email: '', usuario: '', perfil: 'LEITURA', senhaTemporaria: '' } });
  const emailPreenchido = !!watch('email')?.trim();
  // sem e-mail (ou sem envio de e-mail no servidor) não há convite: a senha inicial é informada aqui e a troca é obrigatória no primeiro acesso
  const precisaSenha = !comEmail || !emailPreenchido;
  const criar = useMutation({
    mutationFn: (v: Form) => adminService.criarUsuario({ nome: v.nome, perfil: v.perfil, ...(v.email ? { email: v.email } : {}), ...(v.usuario ? { usuario: v.usuario } : {}), ...(precisaSenha && v.senhaTemporaria ? { senhaTemporaria: v.senhaTemporaria } : {}) }),
    onSuccess: (r) => {
      toast.success(!r.data.conviteEnviado && precisaSenha ? 'Usuário criado com senha temporária: a troca é obrigatória no primeiro acesso.' : r.data.conviteEnviado ? `Convite enviado para ${r.data.email}. O usuário define a própria senha pelo link.` : 'Usuário criado, mas o e-mail do convite não pôde ser enviado. Use "Reenviar convite".');
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

  const rh = useMutation({
    mutationFn: (v: { id: string; rhPapel: RhPapel | null; colaboradorId?: string | null }) => adminService.atualizarRh(v.id, { rhPapel: v.rhPapel, ...(v.colaboradorId !== undefined ? { colaboradorId: v.colaboradorId } : {}) }),
    onSuccess: () => { toast.success('Acesso ao RH atualizado.'); void qc.invalidateQueries({ queryKey: ['usuarios'] }); },
    onError: (e) => toast.error(e instanceof ApiError && [404, 409].includes(e.status ?? 0) ? e.message : 'Não foi possível alterar o acesso ao RH.'),
  });
  // cadastros do sistema do RH, para ligar a um usuário que ainda não tem (só carrega se alguém precisar)
  const colaboradores = useQuery({
    queryKey: ['rh', 'colaboradores-para-vinculo'],
    enabled: (q.data?.data ?? []).some((u) => u.rhPapel && !u.colaborador),
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async ({ signal }) => (await rhService.colaboradores({ limit: 100 }, signal)).data,
  });

  const cols: Column<UsuarioAdmin>[] = [
    { id: 'nome', header: 'Nome', mobile: 'title', cell: (u) => <span className="font-medium">{u.nome}</span> },
    { id: 'usuario', header: 'Usuário', mobile: 'full', cell: (u) => u.usuario ?? '—' },
    { id: 'email', header: 'E-mail', mobile: 'full', cell: (u) => u.email ?? '—' },
    {
      id: 'perfil', header: 'Perfil',
      cell: (u) => (
        <Select value={u.perfil} onValueChange={(p) => perfil.mutate({ id: u.id, perfil: p as Perfil })} disabled={u.id === eu?.id || perfil.isPending}>
          <SelectTrigger className="h-8 w-36 text-xs" aria-label={`Perfil de ${u.nome}`}><SelectValue /></SelectTrigger>
          <SelectContent>{PERFIS.map((p) => <SelectItem key={p} value={p}>{PERFIL_LABEL[p]}</SelectItem>)}</SelectContent>
        </Select>
      ),
    },
    {
      id: 'rh', header: 'Papel no RH',
      cell: (u) => (
        <Select value={u.rhPapel ?? SEM_RH} onValueChange={(v) => rh.mutate({ id: u.id, rhPapel: v === SEM_RH ? null : (v as RhPapel) })} disabled={u.id === eu?.id || rh.isPending}>
          <SelectTrigger className="h-8 w-36 text-xs" aria-label={`Papel no RH de ${u.nome}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_RH}>Sem acesso ao RH</SelectItem>
            {RH_PAPEIS.map((p) => <SelectItem key={p} value={p}>{RH_LABEL[p]}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'cadastro', header: 'Cadastro de colaborador', mobile: 'full',
      cell: (u) =>
        u.colaborador ? (
          <span title="Cadastro vindo do sistema do RH; é ele que dá direito a enviar a própria nota fiscal">{u.colaborador.nome}</span>
        ) : u.rhPapel ? (
          <Select value="" onValueChange={(id) => rh.mutate({ id: u.id, rhPapel: u.rhPapel, colaboradorId: id })} disabled={rh.isPending}>
            <SelectTrigger className="h-8 w-44 text-xs" aria-label={`Vincular cadastro a ${u.nome}`}><SelectValue placeholder="Vincular cadastro…" /></SelectTrigger>
            <SelectContent>{(colaboradores.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        ) : '—',
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
          <DialogHeader><DialogTitle>Novo usuário</DialogTitle><DialogDescription>Informe o usuário, o e-mail ou os dois: a pessoa poderá entrar com qualquer um. {precisaSenha ? 'Sem e-mail (ou com o envio de e-mail desligado) a conta é criada com uma senha inicial e a troca é obrigatória no primeiro acesso.' : 'Com e-mail, o usuário recebe um convite e define a própria senha: você nunca vê nem informa a senha dele. O link vale por 72 horas.'}</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit((v) => { if (!v.email && !v.usuario) { toast.error('Informe o e-mail ou o usuário.'); return; } if (precisaSenha && !(v.senhaTemporaria && v.senhaTemporaria.length >= 12 && /[A-Za-z]/.test(v.senhaTemporaria) && /\d/.test(v.senhaTemporaria))) { toast.error('Informe uma senha temporária com 12+ caracteres, letras e números.'); return; } criar.mutate(v); })} noValidate className="space-y-3">
            <div className="space-y-1"><Label htmlFor="u-nome">Nome</Label><Input id="u-nome" aria-invalid={!!errors.nome} {...register('nome')} />{errors.nome && <p role="alert" className="text-xs text-negative">{errors.nome.message}</p>}</div>
            <div className="space-y-1"><Label htmlFor="u-usuario">Usuário (opcional)</Label><Input id="u-usuario" autoComplete="off" autoCapitalize="none" placeholder="ex.: murilo" aria-invalid={!!errors.usuario} {...register('usuario')} />{errors.usuario && <p role="alert" className="text-xs text-negative">{errors.usuario.message}</p>}</div>
            <div className="space-y-1"><Label htmlFor="u-email">E-mail (opcional)</Label><Input id="u-email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...register('email')} />{errors.email && <p role="alert" className="text-xs text-negative">{errors.email.message}</p>}</div>
            <div className="space-y-1">
              <Label htmlFor="u-perfil">Perfil</Label>
              <Controller control={control} name="perfil" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="u-perfil"><SelectValue /></SelectTrigger><SelectContent>{PERFIS.map((p) => <SelectItem key={p} value={p}>{PERFIL_LABEL[p]}</SelectItem>)}</SelectContent></Select>
              )} />
            </div>
            {precisaSenha && <div className="space-y-1"><Label htmlFor="u-senha">Senha inicial</Label><Input id="u-senha" type="password" autoComplete="new-password" {...register('senhaTemporaria')} /></div>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setNovo(false)}>Cancelar</Button><Button type="submit" disabled={criar.isPending}>{criar.isPending && <LoaderCircle className="animate-spin" />} {precisaSenha ? 'Criar usuário' : 'Enviar convite'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
