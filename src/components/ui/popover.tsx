import * as PopoverPrimitive from '@radix-ui/react-popover';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export const PopoverContent = forwardRef<ElementRef<typeof PopoverPrimitive.Content>, ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>>(
  ({ className, align = 'start', sideOffset = 6, collisionPadding = 8, ...props }, ref) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          'no-print z-[60] max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl shadow-black/40 outline-none data-[state=open]:animate-menu-in',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  ),
);
PopoverContent.displayName = 'PopoverContent';
