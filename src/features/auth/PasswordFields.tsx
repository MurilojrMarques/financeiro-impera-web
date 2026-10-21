import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { forcaDaSenha, requisitosDaSenha } from './password-policy';

/** Campo de senha com botão de mostrar/ocultar (alvo de toque de 44px em telas de toque). */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={visivel ? 'text' : 'password'} className={cn('pr-11', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground pointer-coarse:size-10"
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visivel}
      >
        {visivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

const COR_FORCA = ['bg-border', 'bg-negative', 'bg-warning', 'bg-info', 'bg-positive'] as const;

/** Checklist de requisitos + medidor de força (apoio visual; o servidor valida de verdade). */
export function PasswordRequirements({ senha, id }: { senha: string; id: string }) {
  const requisitos = requisitosDaSenha(senha);
  const forca = forcaDaSenha(senha);
  return (
    <div id={id} className="space-y-2 text-xs" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={cn('h-full flex-1 rounded-full bg-border transition-colors', forca.nivel >= n && COR_FORCA[forca.nivel])} />
          ))}
        </div>
        <span className="w-20 text-right text-muted-foreground">{forca.rotulo}</span>
      </div>
      <ul className="space-y-1">
        {requisitos.map((r) => (
          <li key={r.id} className={cn('flex items-center gap-1.5', r.ok ? 'text-positive' : 'text-muted-foreground')}>
            {r.ok ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3 opacity-60" aria-hidden="true" />}
            <span>{r.rotulo}</span>
            <span className="sr-only">{r.ok ? ' (atendido)' : ' (pendente)'}</span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground">Evite senhas comuns, sequências e seu nome ou e-mail.</p>
    </div>
  );
}
