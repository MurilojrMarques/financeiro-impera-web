import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Alturas: 36px no mouse e 44px em telas de toque (`pointer-coarse`), o mínimo confortável para o polegar.
 * Para botões de ícone dentro de tabelas use `size="icon-sm"` (28px no mouse, 40px no toque).
 */
const buttonVariants = cva(
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-[image:var(--gold-gradient)] text-primary-foreground shadow-[0_1px_0_0_rgb(255_255_255/0.35)_inset] hover:brightness-110',
        secondary: 'border border-border bg-surface text-foreground hover:border-input hover:bg-surface-hover',
        outline: 'border border-border bg-transparent hover:border-input hover:bg-surface',
        ghost: 'hover:bg-surface',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 pointer-coarse:h-11',
        sm: 'h-8 px-3 text-xs pointer-coarse:h-10',
        lg: 'h-10 px-6 pointer-coarse:h-12',
        icon: 'size-9 pointer-coarse:size-11',
        'icon-sm': 'size-7 pointer-coarse:size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, type, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref} type={asChild ? undefined : (type ?? 'button')} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = 'Button';

export { buttonVariants };
