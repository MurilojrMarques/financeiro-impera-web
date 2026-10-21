import { Check, ChevronDown } from 'lucide-react';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { searchKey } from '@/lib/search';
import { cn } from '@/lib/utils';

export interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** rótulo da opção que limpa a seleção (ex.: "Todos") */
  allLabel?: string;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  'aria-label'?: string;
}

const optionClass =
  'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] outline-none hover:bg-surface focus-visible:bg-surface focus-visible:ring-1 focus-visible:ring-primary pointer-coarse:py-3 pointer-coarse:text-base';

/**
 * Combobox com busca (listas longas: lojas, produtos, afiliados).
 * Teclado: ↓ no campo de busca entra na lista; ↑ ↓ Home End navegam; Enter/Espaço escolhem; Esc fecha. Enter na busca escolhe a 1ª opção.
 * As opções são os próprios elementos interativos (`role="option"`), sem botões aninhados.
 */
export function SearchableSelect({
  options, value, onChange, placeholder = 'Selecione', searchPlaceholder = 'Buscar…', allLabel, id, invalid, disabled, loading, className, ...aria
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);
  const nome = aria['aria-label'] ?? 'Opções';

  const filtered = useMemo(() => {
    const q = searchKey(query);
    return q ? options.filter((o) => searchKey(o.label).includes(q)) : options;
  }, [options, query]);

  /** o item que limpa a seleção + as opções filtradas, na ordem exibida */
  const items: { value: string | undefined; label: string }[] = [...(allLabel ? [{ value: undefined, label: allLabel }] : []), ...filtered];

  const pick = (v: string | undefined) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  const optionEls = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);

  const onOptionKey = (e: KeyboardEvent<HTMLElement>, i: number, v: string | undefined) => {
    const els = optionEls();
    const go = (el: HTMLElement | undefined) => {
      e.preventDefault();
      el?.focus();
    };
    if (e.key === 'ArrowDown') go(els[Math.min(i + 1, els.length - 1)]);
    else if (e.key === 'ArrowUp') go(i === 0 ? searchRef.current ?? undefined : els[i - 1]);
    else if (e.key === 'Home') go(els[0]);
    else if (e.key === 'End') go(els[els.length - 1]);
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(v);
    }
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      optionEls()[0]?.focus();
    } else if (e.key === 'Enter' && query && filtered[0]) {
      e.preventDefault();
      pick(filtered[0].value);
    }
  };

  // em telas de toque o teclado cobriria metade da lista: o foco no campo de busca fica por conta do usuário
  const focusSearch = typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={invalid || undefined}
        aria-label={aria['aria-label']}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-surface px-3 text-left text-[13px] transition-colors hover:border-muted-foreground/60 data-[state=open]:border-primary/70 disabled:opacity-50 pointer-coarse:h-11 pointer-coarse:text-base',
          !selected && 'text-muted-foreground',
          selected && 'border-primary/50 bg-primary/[0.06]',
          invalid && 'border-negative',
          className,
        )}
      >
        <span className="min-w-0 truncate">{selected?.label ?? (loading ? 'Carregando…' : placeholder)}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent aria-label={nome} className="w-[max(var(--radix-popover-trigger-width),15rem)] p-2">
        <Input
          ref={searchRef}
          autoFocus={focusSearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder={searchPlaceholder}
          aria-label={`Buscar em ${nome.toLowerCase()}`}
          aria-controls={listId}
          className="mb-2 h-9"
        />
        {items.length > 0 && (
          <ul ref={listRef} id={listId} role="listbox" aria-label={nome} className="max-h-[min(15rem,50dvh)] overflow-y-auto overscroll-contain">
            {items.map((o, i) => {
              const isSelected = o.value === undefined ? !value : o.value === value;
              return (
                <li
                  key={o.value ?? '__todos__'}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  title={o.label}
                  onClick={() => pick(o.value)}
                  onKeyDown={(e) => onOptionKey(e, i, o.value)}
                  className={optionClass}
                >
                  <Check className={cn('size-4 shrink-0 text-primary', isSelected ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                  <span className="truncate">{o.label}</span>
                </li>
              );
            })}
          </ul>
        )}
        {filtered.length === 0 && (
          <p role="status" className="px-2 py-3 text-center text-xs text-muted-foreground">
            Nenhum resultado
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
