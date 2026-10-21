import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { activeFieldClass, FilterField } from './FilterField';

const ALL = '__todos__';

export interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string | undefined;
  options: FilterOption[];
  onChange: (value: string | undefined) => void;
  /** rótulo da opção "todos"; `null` = não existe (o campo sempre tem um valor, como o Critério) */
  allLabel?: string | null;
  loading?: boolean;
  className?: string;
  /** marca o filtro como alterado mesmo quando `value` é o valor padrão (ex.: critério diferente do padrão) */
  active?: boolean;
}

/** Select com opção "Todos" (o Radix não aceita valor vazio, então usamos um sentinela interno). */
export function SelectFilter({ label, value, options, onChange, allLabel = 'Todos', loading, className, active }: Props) {
  const id = `filtro-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const isActive = active ?? value !== undefined;
  return (
    <FilterField label={label} htmlFor={id} active={isActive} className={className}>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
        <SelectTrigger id={id} className={cn(isActive && activeFieldClass)}>
          <SelectValue placeholder={loading ? 'Carregando…' : (allLabel ?? undefined)} />
        </SelectTrigger>
        <SelectContent>
          {allLabel !== null && <SelectItem value={ALL}>{allLabel}</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
          {/* valor vindo da URL que não está na lista (link compartilhado): continua visível e removível */}
          {value && !options.some((o) => o.value === value) && <SelectItem value={value}>{value}</SelectItem>}
        </SelectContent>
      </Select>
    </FilterField>
  );
}
