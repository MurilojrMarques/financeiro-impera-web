import { CalendarRange } from 'lucide-react';
import { useState } from 'react';
import type { DateRange as DayRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatRange, localDateToYmd, rangeForPreset, todaySP, ymdToLocalDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { DateRange, PeriodPreset } from '@/types/filters.types';
import { activeFieldClass, FilterField } from './FilterField';
import { DEFAULT_PERIOD } from '@/hooks/useFilters';

export const PERIOD_LABEL: Record<PeriodPreset, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  '7d': 'Últimos 7 dias',
  '15d': 'Últimos 15 dias',
  '30d': 'Últimos 30 dias',
  'mes-atual': 'Mês atual',
  'mes-anterior': 'Mês anterior',
  personalizado: 'Intervalo personalizado',
};

interface Props {
  preset: PeriodPreset;
  range: DateRange;
  onChange: (value: { periodo: PeriodPreset; de: string; ate: string }) => void;
  label?: string;
}

/** Seletor de período (presets + intervalo personalizado). Datas em America/Sao_Paulo. */
export function DateRangeFilter({ preset, range, onChange, label = 'Período' }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayRange | undefined>();

  const choose = (p: PeriodPreset) => {
    if (p === 'personalizado') {
      setDraft({ from: ymdToLocalDate(range.de), to: ymdToLocalDate(range.ate) });
      setOpen(true);
      return;
    }
    const r = rangeForPreset(p, todaySP());
    onChange({ periodo: p, ...r });
  };

  const apply = (r: DayRange | undefined) => {
    setDraft(r);
    if (r?.from && r.to) {
      onChange({ periodo: 'personalizado', de: localDateToYmd(r.from), ate: localDateToYmd(r.to) });
      setOpen(false);
    }
  };

  const active = preset !== DEFAULT_PERIOD;
  return (
    <FilterField label={label} htmlFor="filtro-periodo" active={active} hint={formatRange(range)}>
      <div className="flex gap-1.5">
        <Select value={preset} onValueChange={(v) => choose(v as PeriodPreset)}>
          <SelectTrigger id="filtro-periodo" className={cn('min-w-0 flex-1', active && activeFieldClass)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABEL) as PeriodPreset[]).map((p) => (
              <SelectItem key={p} value={p}>{PERIOD_LABEL[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="icon" className="shrink-0" aria-label={`Período selecionado: ${formatRange(range)}. Abrir calendário`} title={formatRange(range)}>
              <CalendarRange />
            </Button>
          </PopoverTrigger>
          <PopoverContent aria-label="Escolher o período" className="p-2">
            <Calendar
              mode="range"
              numberOfMonths={1}
              selected={draft ?? { from: ymdToLocalDate(range.de), to: ymdToLocalDate(range.ate) }}
              defaultMonth={ymdToLocalDate(range.de)}
              onSelect={apply}
              max={366}
              disabled={{ after: ymdToLocalDate(todaySP()) }}
            />
            <p className="px-2 pb-1 text-xs text-muted-foreground">Toque no dia inicial e no dia final. Máximo de 366 dias.</p>
          </PopoverContent>
        </Popover>
      </div>
    </FilterField>
  );
}
