import { useCallback, useEffect, useRef } from 'react';

/**
 * Indica, em `data-can-start` / `data-can-end`, se uma lista rolável horizontal tem itens escondidos de cada lado
 * (a classe `.fade-edges-x` usa isso para esmaecer a borda). Reage à rolagem, ao redimensionamento e a `deps`.
 */
export function useScrollEdges<T extends HTMLElement>(deps: readonly unknown[] = []) {
  const ref = useRef<T>(null);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.dataset.canStart = String(el.scrollLeft > 4);
    el.dataset.canEnd = String(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update, ...deps]);

  return { ref, onScroll: update };
}
