import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<ElementRef<typeof SelectPrimitive.Trigger>, ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-surface px-3 text-left text-[13px] text-foreground transition-colors hover:border-muted-foreground/60 data-[state=open]:border-primary/70 data-[placeholder]:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-negative pointer-coarse:h-11 pointer-coarse:text-base',
        className,
      )}
      {...props}
    >
      <span className="min-w-0 truncate">{children}</span>
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  ),
);
SelectTrigger.displayName = 'SelectTrigger';

/**
 * A lista nunca é mais estreita que o campo, mas pode ser mais larga: rótulos longos
 * ("Mesmo período do mês anterior") aparecem inteiros em vez de cortados.
 */
export const SelectContent = forwardRef<ElementRef<typeof SelectPrimitive.Content>, ComponentPropsWithoutRef<typeof SelectPrimitive.Content>>(
  ({ className, children, position = 'popper', sideOffset = 6, collisionPadding = 8, ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          'no-print relative z-[60] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl shadow-black/40 data-[state=open]:animate-menu-in',
          position === 'popper' && 'min-w-[var(--radix-select-trigger-width)] max-w-[min(26rem,calc(100vw-1rem))]',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  ),
);
SelectContent.displayName = 'SelectContent';

export const SelectItem = forwardRef<ElementRef<typeof SelectPrimitive.Item>, ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-[13px] outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface data-[state=checked]:font-medium pointer-coarse:py-3 pointer-coarse:text-base',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2.5 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  ),
);
SelectItem.displayName = 'SelectItem';
