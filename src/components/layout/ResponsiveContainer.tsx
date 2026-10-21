import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ResponsiveContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1600px] px-4 sm:px-6', className)}>{children}</div>;
}
