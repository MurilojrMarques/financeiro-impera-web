import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { LinkIcon, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Notice } from '@/components/feedback/Notice';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { activateAccount, resetPassword, validarLink } from '@/services/auth.service';
import { ApiError } from '@/types/api.types';
import { AuthHeading, AuthShell } from './AuthShell';
import { PasswordInput, PasswordRequirements } from './PasswordFields';
import { novaSenhaSchema, type NovaSenhaForm } from './password-policy';

export type ModoSenha = 'redefinir' | 'ativar';

const TEXTOS = {
  redefinir: {
    titulo: 'Criar nova senha',
    subtitulo: 'Escolha uma senha forte. Ao concluir, todas as sessões abertas serão encerradas.',
    botao: 'Salvar nova senha',
    tipo: 'RESET_SENHA' as const,
    titleDoc: 'Nova senha · Financeiro',
  },
  ativar: {
    titulo: 'Ative sua conta',
    subtitulo: 'Defina a senha de acesso para começar a usar o painel.',
    botao: 'Ativar conta',
    tipo: 'CONVITE' as const,
    titleDoc: 'Ativar conta · Financeiro',
  },
} satisfies Record<ModoSenha, unknown>;

/** O servidor devolve a regra violada em `details`; mostramos só essa mensagem (nunca dados técnicos). */
export function mensagemDeSenha(e: unknown): string {
  if (e instanceof ApiError) {
    if (Array.isArray(e.details)) {
      const msg = (e.details as { message?: unknown }[]).find((d) => typeof d?.message === 'string')?.message;
      if (typeof msg === 'string') return msg;
    }
    if (e.status === 400) return 'Este link é inválido ou expirou. Solicite um novo.';
    if (e.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    if (e.kind === 'network' || e.kind === 'timeout' || e.status === 503) return 'Não foi possível conectar ao servidor. Tente novamente.';
  }
  return 'Não foi possível salvar a senha. Tente novamente.';
}

/**
 * Definição de senha a partir de um link de uso único recebido por e-mail (redefinição ou convite). O token vem no FRAGMENTO da URL
 * (#token=…): nunca é enviado ao servidor de hospedagem nem vai em Referer; é lido uma vez e apagado do endereço.
 */
export function SetPasswordPage({ modo }: { modo: ModoSenha }) {
  const t = TEXTOS[modo];
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') ?? '');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    document.title = t.titleDoc;
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname); // tira o token da barra de endereço/histórico
  }, [t.titleDoc]);

  const link = useQuery({
    queryKey: ['link-conta', modo, token],
    enabled: token.length > 0,
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
    queryFn: () => validarLink(token),
  });

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<NovaSenhaForm>({
    resolver: zodResolver(novaSenhaSchema),
    defaultValues: { novaSenha: '', confirmar: '' },
  });
  const senha = watch('novaSenha');

  const onSubmit = handleSubmit(async ({ novaSenha }) => {
    setErro(null);
    try {
      await (modo === 'redefinir' ? resetPassword(token, novaSenha) : activateAccount(token, novaSenha));
      navigate('/login', { replace: true, state: { aviso: modo === 'redefinir' ? 'senha-redefinida' : 'conta-ativada' } });
    } catch (e) {
      setErro(mensagemDeSenha(e));
    }
  });

  const invalido = !token || link.isError || (link.isSuccess && (!link.data.valido || link.data.tipo !== t.tipo));

  if (invalido) {
    return (
      <AuthShell>
        <AuthHeading title="Link inválido ou expirado" subtitle="Por segurança, os links de e-mail valem por pouco tempo e só podem ser usados uma vez." />
        <Notice tone="warning" icon={LinkIcon} role="alert" className="mb-5">
          {modo === 'redefinir' ? 'Peça um novo link para redefinir a senha.' : 'Peça a um administrador para reenviar o convite.'}
        </Notice>
        {modo === 'redefinir' && (
          <Button asChild size="lg" className="mb-2 w-full">
            <Link to="/esqueci-senha">Solicitar novo link</Link>
          </Button>
        )}
        <Button asChild variant="secondary" className="w-full">
          <Link to="/login">Voltar ao login</Link>
        </Button>
      </AuthShell>
    );
  }

  if (link.isPending) {
    return (
      <AuthShell>
        <AuthHeading title={t.titulo} subtitle="Verificando o link…" />
        <div className="flex justify-center py-6" role="status" aria-label="Verificando o link">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeading title={t.titulo} subtitle={t.subtitulo} />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nova-senha">Nova senha</Label>
          <PasswordInput id="nova-senha" autoComplete="new-password" autoFocus aria-invalid={!!errors.novaSenha} aria-describedby="requisitos-senha" {...register('novaSenha')} />
          {errors.novaSenha && <p role="alert" className="text-xs text-negative">{errors.novaSenha.message}</p>}
        </div>
        <PasswordRequirements senha={senha} id="requisitos-senha" />
        <div className="space-y-1.5">
          <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
          <PasswordInput id="confirmar-senha" autoComplete="new-password" aria-invalid={!!errors.confirmar} {...register('confirmar')} />
          {errors.confirmar && <p role="alert" className="text-xs text-negative">{errors.confirmar.message}</p>}
        </div>
        {erro && <Notice tone="danger" role="alert">{erro}</Notice>}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          {isSubmitting ? 'Salvando…' : t.botao}
        </Button>
      </form>
    </AuthShell>
  );
}

export const ResetPasswordPage = () => <SetPasswordPage modo="redefinir" />;
export const ActivateAccountPage = () => <SetPasswordPage modo="ativar" />;
