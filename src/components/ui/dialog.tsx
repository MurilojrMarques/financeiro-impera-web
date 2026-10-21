import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Celular: folha ("bottom sheet") que sobe da base, com alça, rolagem interna e respeito à área segura.
 * A partir de `sm`: modal centralizado. `size` controla a largura máxima do modal (a folha ocupa a largura toda).
 */
const contentVariants = cva(
  [
    'no-print fixed z-50 grid grid-cols-1 gap-4 overflow-y-auto overscroll-contain border border-border bg-card p-5 shadow-2xl shadow-black/60 outline-none',
    // celular
    'inset-x-0 bottom-0 max-h-[92dvh] w-full rounded-t-2xl border-b-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]',
    'data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out',
    // ≥ sm
    'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border-b sm:pb-5',
    'sm:data-[state=open]:animate-pop-in sm:data-[state=closed]:animate-pop-out',
  ],
  {
    variants: {
      size: { md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, VariantProps<typeof contentVariants> {}

export const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, size, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="no-print fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content ref={ref} className={cn(contentVariants({ size }), className)} {...props}>
        <div className="mx-auto -mb-2 -mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden="true" />
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground pointer-coarse:size-10"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
);
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => <div className={cn('flex flex-col gap-1.5 pr-8', className)} {...props} />;
export const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
);

export const DialogTitle = forwardRef<ElementRef<typeof DialogPrimitive.Title>, ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn('text-base font-semibold leading-snug', className)} {...props} />,
);
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = forwardRef<ElementRef<typeof DialogPrimitive.Description>, ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn('text-[13px] text-muted-foreground', className)} {...props} />,
);
DialogDescription.displayName = 'DialogDescription';
