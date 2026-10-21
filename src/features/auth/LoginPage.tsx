import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Eye, EyeOff, LoaderCircle, TimerOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Notice } from '@/components/feedback/Notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { authConfig } from '@/services/auth.service';
import { ApiError } from '@/types/api.types';
import { AuthHeading, AuthShell } from './AuthShell';
import { loginSchema, type LoginForm } from './schemas';

function loginErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return 'E-mail ou senha incorretos.';
    if (e.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    if (e.kind === 'network' || e.kind === 'timeout' || e.status === 503) return 'Não foi possível conectar ao servidor. Tente novamente.';
    if (e.status === 422) return 'Verifique os dados informados.';
  }
  return 'Não foi possível entrar. Tente novamente.';
}

/** Destino pós-login: somente caminhos internos (evita open redirect). */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : '/dashboard';
}

export default function LoginPage() {
  const { login, status, user, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = safeNext(new URLSearchParams(location.search).get('next'));
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // aviso de sucesso vindo das telas de senha (redefinição ou ativação de conta)
  const aviso = (location.state as { aviso?: string } | null)?.aviso;
  // a recuperação por e-mail só é oferecida se o servidor tiver e-mail configurado (padrão: oferece)
  const config = useQuery({ queryKey: ['auth-config'], queryFn: async () => (await authConfig()).data, staleTime: 300_000, retry: false });
  const recuperacao = config.data?.recuperacaoSenha ?? true;

  useEffect(() => {
    document.title = 'Entrar · Financeiro';
  }, []);

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', senha: '' } });

  if (status === 'authenticated' && user) {
    return <Navigate to={user.trocaSenhaObrigatoria ? '/trocar-senha' : next} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const u = await login(values.email, values.senha);
      navigate(u.trocaSenhaObrigatoria ? '/trocar-senha' : next, { replace: true });
    } catch (e) {
      setServerError(loginErrorMessage(e));
    }
  });

  // em telas de toque o teclado abriria sozinho e cobriria o formulário: o foco fica por conta do usuário
  const autoFocusEmail = !window.matchMedia('(pointer: coarse)').matches;

  return (
    <AuthShell>
      <AuthHeading title="Financeiro" subtitle="Entre com sua conta para acessar o painel." />

      {aviso && (
        <Notice tone="success" icon={CheckCircle2} role="status" className="mb-4">
          {aviso === 'conta-ativada' ? 'Conta ativada. Entre com a senha que você acabou de definir.' : 'Senha alterada. Entre com a nova senha.'}
        </Notice>
      )}

      {sessionExpired && (
        <Notice tone="warning" icon={TimerOff} role="alert" className="mb-4">
          <strong className="font-medium text-foreground">Sua sessão expirou.</strong> Por segurança, entre novamente para continuar.
        </Notice>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoFocus={autoFocusEmail}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-erro' : undefined}
            {...register('email')}
          />
          {errors.email && <p id="email-erro" role="alert" className="text-xs text-negative">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="senha">Senha</Label>
          <div className="relative">
            <Input
              id="senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="pr-11"
              aria-invalid={!!errors.senha}
              aria-describedby={errors.senha ? 'senha-erro' : undefined}
              {...register('senha')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground pointer-coarse:size-10"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.senha && <p id="senha-erro" role="alert" className="text-xs text-negative">{errors.senha.message}</p>}
          {recuperacao && (
            <p className="pt-0.5 text-right text-xs">
              <Link to="/esqueci-senha" className="text-primary underline-offset-4 hover:underline">Esqueci minha senha</Link>
            </p>
          )}
        </div>

        {serverError && <Notice tone="danger" role="alert">{serverError}</Notice>}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthShell>
  );
}
