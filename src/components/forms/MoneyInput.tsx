import { forwardRef, useEffect, useState, type InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';
import { maskMoneyInput, parseMoneyToCentavos } from '@/lib/currency';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** centavos inteiros (null = vazio) */
  value: number | null;
  onValueChange: (centavos: number | null) => void;
}

/**
 * Campo monetário com máscara brasileira. O estado externo é SEMPRE centavos inteiros (nunca float):
 * digitar "12345" => "123,45" => 12345.
 */
export const MoneyInput = forwardRef<HTMLInputElement, Props>(({ value, onValueChange, className, ...props }, ref) => {
  const [text, setText] = useState(value === null ? '' : maskMoneyInput(String(Math.abs(value))));

  // mantém o texto sincronizado quando o valor muda por fora (reset do formulário)
  useEffect(() => {
    const atual = parseMoneyToCentavos(text);
    if (value === null && text !== '') setText('');
    else if (value !== null && atual !== value) setText(maskMoneyInput(String(value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground" aria-hidden="true">R$</span>
      <Input
        {...props}
        ref={ref}
        className={['pl-9 text-right tabular', className].filter(Boolean).join(' ')}
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onChange={(e) => {
          const masked = maskMoneyInput(e.target.value);
          setText(masked);
          onValueChange(masked === '' ? null : parseMoneyToCentavos(masked));
        }}
      />
    </div>
  );
});
MoneyInput.displayName = 'MoneyInput';
