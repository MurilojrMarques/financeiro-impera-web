import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, LoaderCircle, MailCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Notice } from '@/components/feedback/Notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPassword } from '@/services/auth.service';
import { ApiError } from '@/types/api.types';
import { AuthHeading, AuthShell } from './AuthShell';
import { esqueciSenhaSchema, type EsqueciSenhaForm } from './password-policy';

/**
 * "Esqueci minha senha". A resposta da API é sempre a mesma (existindo ou não a conta), e a tela também: nunca confirma se o e-mail
 * está cadastrado.
 */
export default function ForgotPasswordPage() {
  const [enviado, setEnviado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    document.title = 'Recuperar senha · Financeiro';
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EsqueciSenhaForm>({ resolver: zodResolver(esqueciSenhaSchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setErro(null);
    try {
      await forgotPassword(email);
      setEnviado(email);
    } catch (e) {
      setErro(
        e instanceof ApiError && e.status === 429
          ? 'Muitas solicitações. Aguarde alguns minutos e tente novamente.'
          : 'Não foi possível enviar agora. Verifique a conexão e tente novamente.',
      );
    }
  });

  if (enviado) {
    return (
      <AuthShell>
        <AuthHeading title="Verifique seu e-mail" subtitle="Enviamos as instruções, se o endereço estiver cadastrado." />
        <Notice tone="success" icon={MailCheck} role="status" className="mb-5">
          Se <strong className="font-medium text-foreground">{enviado}</strong> estiver cadastrado, você receberá em instantes um link para criar uma nova senha. O link vale por
          30 minutos e só pode ser usado uma vez.
        </Notice>
        <ul className="mb-6 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Confira também a caixa de spam ou lixo eletrônico.</li>
          <li>Se não chegar em alguns minutos, tente de novo (há um limite de pedidos por hora).</li>
        </ul>
        <Button asChild variant="secondary" className="w-full">
          <Link to="/login"><ArrowLeft /> Voltar ao login</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeading title="Recuperar senha" subtitle="Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha." />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoFocus={!window.matchMedia('(pointer: coarse)').matches} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-erro' : undefined} {...register('email')} />
          {errors.email && <p id="email-erro" role="alert" className="text-xs text-negative">{errors.email.message}</p>}
        </div>
        {erro && <Notice tone="danger" role="alert">{erro}</Notice>}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          {isSubmitting ? 'Enviando…' : 'Enviar link'}
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link to="/login"><ArrowLeft /> Voltar ao login</Link>
        </Button>
      </form>
    </AuthShell>
  );
}
