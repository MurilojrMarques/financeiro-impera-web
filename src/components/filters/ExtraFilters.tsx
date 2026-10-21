import { SearchableSelect } from '@/components/forms/SearchableSelect';
import { useDimensionOptions, type OptionKind } from '@/hooks/useFilterOptions';
import type { Params } from '@/lib/query-keys';
import { grupoLabel, statusLabel } from '@/lib/formatters';
import { FilterField } from './FilterField';
import { SelectFilter } from './SelectFilter';

interface BaseProps {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  /** período + critério (sem os demais filtros) para listar valores existentes */
  base: Params;
}

/** Filtro com lista dinâmica (valores existentes no período) e busca. */
function DynamicFilter({ kind, label, placeholder, value, onChange, base }: BaseProps & { kind: OptionKind; label: string; placeholder: string }) {
  const { data, isLoading } = useDimensionOptions(kind, base);
  const id = `filtro-${kind}`;
  return (
    <FilterField label={label} htmlFor={id} active={value !== undefined}>
      <SearchableSelect
        id={id}
        options={data ?? []}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        allLabel="Todos"
        loading={isLoading}
        aria-label={label}
      />
    </FilterField>
  );
}

export const StoreFilter = (p: BaseProps) => <DynamicFilter {...p} kind="loja" label="Loja" placeholder="Todas as lojas" />;
export const ProductFilter = (p: BaseProps) => <DynamicFilter {...p} kind="produto" label="Produto" placeholder="Todos os produtos" />;
export const AffiliateFilter = (p: BaseProps) => <DynamicFilter {...p} kind="afiliadoId" label="Afiliado" placeholder="Todos os afiliados" />;
export const OriginFilter = (p: BaseProps) => <DynamicFilter {...p} kind="origem" label="Origem" placeholder="Todas as origens" />;
export const CampaignFilter = (p: BaseProps) => <DynamicFilter {...p} kind="campanha" label="Campanha" placeholder="Todas as campanhas" />;
export const AttendantFilter = (p: BaseProps) => <DynamicFilter {...p} kind="atendente" label="Atendente" placeholder="Todos os atendentes" />;

const METODOS = ['Cartão', 'Pix', 'Boleto'];
export const PaymentMethodFilter = ({ value, onChange }: Omit<BaseProps, 'base'>) => (
  <SelectFilter label="Pagamento" value={value} onChange={onChange} options={METODOS.map((m) => ({ value: m, label: m }))} />
);

const STATUS = ['PAGO', 'ESTORNADO', 'CHARGEBACK', 'PENDENTE_CONCILIACAO'];
export const StatusFilter = ({ value, onChange }: Omit<BaseProps, 'base'>) => (
  <SelectFilter label="Status" value={value} onChange={onChange} options={STATUS.map((s) => ({ value: s, label: statusLabel(s) }))} />
);

const GRUPOS = ['FRONT', 'BACKEND_OUTROS', 'CALL_CENTER', 'RECUPERACAO', 'AFILIADO', 'NAO_CLASSIFICADA'];
export const GroupFilter = ({ value, onChange }: Omit<BaseProps, 'base'>) => (
  <SelectFilter label="Grupo financeiro" value={value} onChange={onChange} options={GRUPOS.map((g) => ({ value: g, label: grupoLabel(g) }))} />
);

const TIPOS = [
  { value: 'COMPRA', label: 'Compra inicial' },
  { value: 'UPSELL', label: 'Upsell' },
  { value: 'DOWNSELL', label: 'Downsell' },
];
export const SaleTypeFilter = ({ value, onChange }: Omit<BaseProps, 'base'>) => (
  <SelectFilter label="Tipo de venda" value={value} onChange={onChange} options={TIPOS} />
);
