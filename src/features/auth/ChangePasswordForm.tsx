import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Notice } from '@/components/feedback/Notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword } from '@/services/auth.service';
import { ApiError } from '@/types/api.types';
import { changePasswordSchema, type ChangePasswordForm as Values } from './schemas';

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p id={`${id}-erro`} role="alert" className="text-xs text-negative">{error}</p>}
    </div>
  );
}

/** Troca de senha (obrigatória no primeiro acesso ou voluntária em Configurações). */
export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { senhaAtual: '', novaSenha: '', confirmar: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      await changePassword(v.senhaAtual, v.novaSenha);
      toast.success('Senha alterada com sucesso.');
      reset();
      onDone?.();
    } catch (e) {
      setServerError(
        e instanceof ApiError && e.status === 401 ? 'A senha atual está incorreta.' : e instanceof ApiError && e.status === 422 ? e.message : 'Não foi possível alterar a senha.',
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="senhaAtual" label="Senha atual" error={errors.senhaAtual?.message}>
        <Input id="senhaAtual" type="password" autoComplete="current-password" aria-invalid={!!errors.senhaAtual} {...register('senhaAtual')} />
      </Field>
      <Field id="novaSenha" label="Nova senha" error={errors.novaSenha?.message}>
        <Input id="novaSenha" type="password" autoComplete="new-password" aria-invalid={!!errors.novaSenha} aria-describedby="novaSenha-ajuda" {...register('novaSenha')} />
        <p id="novaSenha-ajuda" className="text-xs text-muted-foreground">Mínimo de 12 caracteres, com letras e números.</p>
      </Field>
      <Field id="confirmar" label="Confirmar nova senha" error={errors.confirmar?.message}>
        <Input id="confirmar" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmar} {...register('confirmar')} />
      </Field>
      {serverError && <Notice tone="danger" role="alert">{serverError}</Notice>}
      <Button type="submit" disabled={isSubmitting} className="max-sm:w-full">
        {isSubmitting && <LoaderCircle className="animate-spin" />} Alterar senha
      </Button>
    </form>
  );
}
