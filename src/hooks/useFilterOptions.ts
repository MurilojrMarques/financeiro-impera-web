import { useQuery } from '@tanstack/react-query';
import type { Option } from '@/components/forms/SearchableSelect';
import { dimLabel } from '@/lib/formatters';
import type { Params } from '@/lib/query-keys';
import { afiliadosService } from '@/services/afiliados.service';
import { callCenterService } from '@/services/call-center.service';
import { campanhasService } from '@/services/campanhas.service';
import { dashboardService } from '@/services/dashboard.service';
import { vendasService } from '@/services/vendas.service';
import type { DimRow } from '@/types/financial.types';

export type OptionKind = 'loja' | 'produto' | 'origem' | 'campanha' | 'atendente' | 'afiliadoId';

const toOptions = (rows: DimRow[]): Option[] =>
  rows
    .filter((r) => r.chave !== null)
    .map((r) => ({ value: r.chave as string, label: dimLabel(r.chave) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

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
          // /dashboard/* é acessível a todos os perfis; as demais rotas exigem ANALISTA+
          return toOptions((await dashboardService.receitasPorLoja(base, signal)).data);
        case 'produto':
          return toOptions((await vendasService.porProduto(base, signal)).data);
        case 'origem':
          return toOptions((await vendasService.porOrigem(base, signal)).data);
        case 'campanha':
          return toOptions((await campanhasService.porCampanha(base, signal)).data);
        case 'atendente':
          return toOptions((await callCenterService.porAtendente(base, signal)).data);
        case 'afiliadoId':
          return (await afiliadosService.ranking({ ...base, limit: 50 }, signal)).data
            .map((a) => ({ value: a.id, label: a.nome }))
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
      }
    },
  });
}
