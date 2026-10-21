import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export const DropdownMenuContent = forwardRef<ElementRef<typeof DropdownPrimitive.Content>, ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>>(
  ({ className, sideOffset = 8, collisionPadding = 8, ...props }, ref) => (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          'no-print z-[60] min-w-[12rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl shadow-black/40 data-[state=open]:animate-menu-in',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  ),
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = forwardRef<ElementRef<typeof DropdownPrimitive.Item>, ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>>(
  ({ className, ...props }, ref) => (
    <DropdownPrimitive.Item
      ref={ref}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-surface [&_svg]:size-4 [&_svg]:text-muted-foreground pointer-coarse:py-3 pointer-coarse:text-[15px]',
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuLabel = forwardRef<ElementRef<typeof DropdownPrimitive.Label>, ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>>(
  ({ className, ...props }, ref) => <DropdownPrimitive.Label ref={ref} className={cn('px-2.5 py-2 text-xs text-muted-foreground', className)} {...props} />,
);
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export const DropdownMenuSeparator = forwardRef<ElementRef<typeof DropdownPrimitive.Separator>, ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>>(
  ({ className, ...props }, ref) => <DropdownPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />,
);
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';
