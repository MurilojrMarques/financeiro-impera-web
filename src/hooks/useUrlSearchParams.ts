import { useCallback, useLayoutEffect, useRef } from 'react';
import { useSearchParams, type NavigateOptions } from 'react-router-dom';

/**
 * Parâmetros de URL com atualização FUNCIONAL SEGURA.
 * O `setSearchParams(fn)` do React Router não enfileira: duas atualizações antes da próxima renderização leem o mesmo
 * estado antigo e a segunda apaga a primeira (ex.: trocar o período e logo em seguida a comparação). Aqui cada atualização
 * parte da última URL já solicitada, então elas se acumulam.
 */
export function useUrlSearchParams() {
  const [sp, setSp] = useSearchParams();
  const latest = useRef(sp);

  useLayoutEffect(() => {
    latest.current = sp;
  });

  const update = useCallback(
    (fn: (prev: URLSearchParams) => URLSearchParams, options?: NavigateOptions) => {
      const next = fn(new URLSearchParams(latest.current));
      latest.current = next;
      setSp(next, options);
    },
    [setSp],
  );

  return { sp, update };
}
