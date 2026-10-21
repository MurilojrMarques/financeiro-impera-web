import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Em telas de toque o texto do campo vai a 16px: abaixo disso o Safari do iPhone dá zoom ao focar e desloca a página.
 */
const base =
  'w-full rounded-md border border-input bg-surface px-3 text-[13px] text-foreground placeholder:text-muted-foreground transition-colors hover:border-muted-foreground/60 focus-visible:border-primary/70 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-negative pointer-coarse:text-base';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, type = 'text', ...props }, ref) => (
  <input ref={ref} type={type} className={cn(base, 'h-9 pointer-coarse:h-11', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, 'min-h-20 py-2', className)} {...props} />
));
Textarea.displayName = 'Textarea';
