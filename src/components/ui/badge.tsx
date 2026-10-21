import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none', {
  variants: {
    variant: {
      default: 'border-border bg-surface text-muted-foreground',
      gold: 'border-primary/40 bg-primary/10 text-primary',
      positive: 'border-positive/40 bg-positive/10 text-positive',
      negative: 'border-negative/40 bg-negative/10 text-negative',
      info: 'border-info/40 bg-info/10 text-info',
      warning: 'border-warning/40 bg-warning/10 text-warning',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => <span className={cn(badgeVariants({ variant }), className)} {...props} />;
