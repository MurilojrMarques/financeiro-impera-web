import { useQuery } from '@tanstack/react-query';
import type { Option } from '@/components/forms/SearchableSelect';
import { dimLabel } from '@/lib/formatters';
import type { Params } from '@/lib/query-keys';
import { afiliadosService } from '@/services/afiliados.service';
import { dashboardService } from '@/services/dashboard.service';

export type OptionKind = 'loja' | 'produto' | 'origem' | 'campanha' | 'atendente' | 'afiliadoId';

const toOptions = (nomes: string[]): Option[] =>
  nomes.map((n) => ({ value: n, label: dimLabel(n) })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

/**
 * Opções dos filtros vêm da própria API (valores realmente existentes no período). Só dependem do período e do
 * critério: não do próprio filtro (senão a lista encolheria ao selecionar).
 */
export function useDimensionOptions(kind: OptionKind, base: Params, enabled = true) {
  return useQuery<Option[]>({
    queryKey: ['filter-options', kind, base],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      switch (kind) {
        case 'loja':
        case 'produto':
        case 'origem':
        case 'campanha':
        case 'atendente':
          return toOptions((await dashboardService.opcoes({ ...base, dim: kind }, signal)).data);
        case 'afiliadoId':
          return (await afiliadosService.ranking({ ...base, limit: 50 }, signal)).data
            .map((a) => ({ value: a.id, label: a.nome }))
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
      }
    },
  });
}
