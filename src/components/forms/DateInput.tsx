import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDate, localDateToYmd, ymdToLocalDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

interface Props {
  /** AAAA-MM-DD */
  value: string;
  onChange: (ymd: string) => void;
  id?: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  'aria-describedby'?: string;
}

/** Seletor de data único (retorna AAAA-MM-DD; sem conversão de fuso). */
export function DateInput({ value, onChange, id, placeholder = 'Selecione a data', invalid, disabled, ...aria }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="secondary"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground', invalid && 'border-negative')}
          {...aria}
        >
          <CalendarDays /> {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-label="Escolher a data">
        <Calendar
          mode="single"
          selected={value ? ymdToLocalDate(value) : undefined}
          defaultMonth={value ? ymdToLocalDate(value) : undefined}
          onSelect={(d) => {
            if (d) {
              onChange(localDateToYmd(d));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
