import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@/lib/utils';

export const Checkbox = forwardRef<ElementRef<typeof CheckboxPrimitive.Root>, ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn('flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-surface data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-50', className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3 text-primary-foreground" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);
Checkbox.displayName = 'Checkbox';
