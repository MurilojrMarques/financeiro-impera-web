import { z } from 'zod';

/**
 * Espelho da política do backend, só para orientar a digitação (o backend é quem decide: também recusa senhas comuns,
 * sequências, repetições e senhas que contenham o nome ou o e-mail).
 */
export interface Requisito {
  id: string;
  rotulo: string;
  ok: boolean;
}

export const MIN_SENHA = 12;

export function requisitosDaSenha(senha: string): Requisito[] {
  return [
    { id: 'tamanho', rotulo: `Pelo menos ${MIN_SENHA} caracteres`, ok: senha.length >= MIN_SENHA },
    { id: 'letras', rotulo: 'Letras (maiúsculas e minúsculas ajudam)', ok: /[A-Za-z]/.test(senha) },
    { id: 'numeros', rotulo: 'Pelo menos um número', ok: /\d/.test(senha) },
  ];
}

/** 0 a 4, só visual. Considera tamanho, variedade de caracteres e repetição. */
export function forcaDaSenha(senha: string): { nivel: 0 | 1 | 2 | 3 | 4; rotulo: string } {
  if (!senha) return { nivel: 0, rotulo: '' };
  let pontos = 0;
  if (senha.length >= 12) pontos++;
  if (senha.length >= 16) pontos++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++;
  if (/\d/.test(senha) && /[^A-Za-z0-9]/.test(senha)) pontos++;
  if (new Set(senha.toLowerCase()).size < 6) pontos = Math.min(pontos, 1);
  const nivel = Math.min(4, pontos) as 0 | 1 | 2 | 3 | 4;
  return { nivel, rotulo: ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'][nivel] ?? '' };
}

export const novaSenhaSchema = z
  .object({
    novaSenha: z
      .string()
      .min(MIN_SENHA, `A senha deve ter ao menos ${MIN_SENHA} caracteres`)
      .max(256)
      .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
      .regex(/\d/, 'Inclua ao menos um número'),
    confirmar: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((v) => v.novaSenha === v.confirmar, { message: 'As senhas não coincidem', path: ['confirmar'] });
export type NovaSenhaForm = z.infer<typeof novaSenhaSchema>;

export const esqueciSenhaSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido').max(254),
});
export type EsqueciSenhaForm = z.infer<typeof esqueciSenhaSchema>;
