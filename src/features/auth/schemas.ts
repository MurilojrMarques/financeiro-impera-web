import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido').max(254),
  senha: z.string().min(1, 'Informe a senha').max(256),
});
export type LoginForm = z.infer<typeof loginSchema>;

/** Política do backend: 12+ caracteres, com letras e números. */
export const changePasswordSchema = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual'),
    novaSenha: z
      .string()
      .min(12, 'A senha deve ter ao menos 12 caracteres')
      .max(256)
      .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
      .regex(/\d/, 'Inclua ao menos um número'),
    confirmar: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((v) => v.novaSenha === v.confirmar, { message: 'As senhas não coincidem', path: ['confirmar'] })
  .refine((v) => v.novaSenha !== v.senhaAtual, { message: 'A nova senha deve ser diferente da atual', path: ['novaSenha'] });
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
