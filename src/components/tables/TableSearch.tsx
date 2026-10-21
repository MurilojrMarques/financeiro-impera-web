import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}

/** Busca com debounce (evita uma requisição por tecla). */
export function TableSearch({ value, onChange, placeholder = 'Buscar…', label = 'Buscar' }: Props) {
  const [local, setLocal] = useState(value);
  const [seen, setSeen] = useState(value);
  // mudança externa do valor (ex.: link com busca): sincroniza durante a renderização, sem efeito
  if (value !== seen) {
    setSeen(value);
    setLocal(value);
  }
  const debounced = useDebounce(local, 350);

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // dispara só quando o texto digitado (já com debounce) muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input type="search" inputMode="search" enterKeyHint="search" value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} aria-label={label} className="pl-9" />
    </div>
  );
}
