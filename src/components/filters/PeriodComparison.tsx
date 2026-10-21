import { useState } from 'react';
import type { DateRange as DayRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatRange, localDateToYmd, ymdToLocalDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { ComparePreset, DateRange } from '@/types/filters.types';
import { activeFieldClass, FilterField } from './FilterField';

export const COMPARE_LABEL: Record<ComparePreset, string> = {
  nenhuma: 'Sem comparação',
  'periodo-anterior': 'Período anterior',
  'mes-anterior': 'Mesmo período do mês anterior',
  personalizado: 'Intervalo personalizado',
};

interface Props {
  preset: ComparePreset;
  /** intervalo efetivo de comparação (null = sem comparação) */
  range: DateRange | null;
  onChange: (value: { comparar: ComparePreset; compDe: string; compAte: string }) => void;
  /** intervalo atual: base para sugerir o calendário */
  base: DateRange;
}

export function PeriodComparison({ preset, range, onChange, base }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayRange | undefined>();

  const choose = (p: ComparePreset) => {
    if (p === 'personalizado') {
      setDraft(range ? { from: ymdToLocalDate(range.de), to: ymdToLocalDate(range.ate) } : undefined);
      onChange({ comparar: p, compDe: range?.de ?? '', compAte: range?.ate ?? '' });
      setOpen(true);
      return;
    }
    onChange({ comparar: p, compDe: '', compAte: '' });
  };

  const apply = (r: DayRange | undefined) => {
    setDraft(r);
    if (r?.from && r.to) {
      onChange({ comparar: 'personalizado', compDe: localDateToYmd(r.from), compAte: localDateToYmd(r.to) });
      setOpen(false);
    }
  };

  const active = preset !== 'nenhuma';
  return (
    <FilterField label="Comparar com" htmlFor="filtro-comparar" active={active} hint={range ? `Comparando com ${formatRange(range)}` : undefined}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div>
            <Select value={preset} onValueChange={(v) => choose(v as ComparePreset)}>
              <SelectTrigger id="filtro-comparar" className={cn(active && activeFieldClass)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(COMPARE_LABEL) as ComparePreset[]).map((p) => (
                  <SelectItem key={p} value={p}>{COMPARE_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverAnchor>
        <PopoverContent aria-label="Escolher o período de comparação" className="p-2">
          <Calendar mode="range" selected={draft} defaultMonth={ymdToLocalDate(range?.de ?? base.de)} onSelect={apply} max={366} />
          <p className="px-2 pb-1 text-xs text-muted-foreground">Escolha o intervalo de comparação.</p>
        </PopoverContent>
      </Popover>
    </FilterField>
  );
}
