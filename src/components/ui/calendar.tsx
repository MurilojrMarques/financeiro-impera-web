import { type ComponentProps } from 'react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import { cn } from '@/lib/utils';

export function Calendar({ className, ...props }: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={ptBR}
      weekStartsOn={0}
      showOutsideDays
      className={cn('financeiro-calendar', className)}
      {...props}
    />
  );
}
