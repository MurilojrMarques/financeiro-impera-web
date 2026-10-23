import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageGrid } from '@/components/layout/PageGrid';
import { ConfirmDialog } from '@/components/forms/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm';
import { useAuth } from '@/hooks/useAuth';
import { retryPolicy } from '@/hooks/useReport';
import { formatDateTime } from '@/lib/dates';
import * as authService from '@/services/auth.service';

export function AccountPanel() {
  const { user, logoutAll } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmAll, setConfirmAll] = useState(false);

  const sessoes = useQuery({ queryKey: ['auth', 'sessions'], retry: retryPolicy, queryFn: async ({ signal }) => (await authService.sessions(signal)).data });
  const revoke = useMutation({
    mutationFn: (id: string) => authService.revokeSession(id),
    onSuccess: () => { toast.success('Sessão encerrada.'); void qc.invalidateQueries({ queryKey: ['auth', 'sessions'] }); },
    onError: () => toast.error('Não foi possível encerrar a sessão.'),
  });

  return (
    <PageGrid cols={2}>
      <Card>
        <CardHeader><CardTitle>Minha conta</CardTitle><CardDescription>Dados do usuário autenticado</CardDescription></CardHeader>
        <CardContent>
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Nome</dt><dd className="min-w-0 truncate text-right">{user?.nome}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">E-mail</dt><dd className="min-w-0 truncate text-right">{user?.email ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Usuário</dt><dd className="min-w-0 truncate text-right">{user?.usuario ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Perfil</dt><dd><Badge variant="gold">{user?.perfil}</Badge></dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alterar senha</CardTitle><CardDescription>Ao trocar a senha, suas outras sessões são encerradas.</CardDescription></CardHeader>
        <CardContent><ChangePasswordForm onDone={() => void qc.invalidateQueries({ queryKey: ['auth', 'sessions'] })} /></CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><CardTitle>Sessões ativas</CardTitle><CardDescription>Dispositivos conectados à sua conta</CardDescription></div>
          <Button variant="outline" size="sm" onClick={() => setConfirmAll(true)}><LogOut /> Encerrar todas</Button>
        </CardHeader>
        <CardContent>
          {sessoes.error ? <ErrorState error={sessoes.error} compact onRetry={() => void sessoes.refetch()} /> : (
            <ul className="divide-y divide-border/60 text-[13px]">
              {(sessoes.data ?? []).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 truncate">{s.userAgent ?? 'Dispositivo desconhecido'}</span>
                      {s.atual && <Badge variant="positive" className="shrink-0">esta sessão</Badge>}
                    </span>
                    <span className="text-xs text-muted-foreground">IP {s.ip ?? '—'} · último uso {formatDateTime(s.ultimoUsoEm)} · expira {formatDateTime(s.expiraEm)}</span>
                  </span>
                  {!s.atual && <Button variant="ghost" size="sm" className="-ml-3 sm:ml-0" disabled={revoke.isPending} onClick={() => revoke.mutate(s.id)}>Encerrar</Button>}
                </li>
              ))}
              {sessoes.isPending && <li className="py-3 text-xs text-muted-foreground">Carregando…</li>}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Encerrar todas as sessões?"
        description="Você será desconectado deste e de todos os outros dispositivos."
        confirmLabel="Encerrar todas"
        destructive
        onConfirm={async () => { await logoutAll(); navigate('/login', { replace: true }); }}
      />
    </PageGrid>
  );
}
