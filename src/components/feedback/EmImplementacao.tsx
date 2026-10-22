import { Badge } from '@/components/ui/badge';

/** Comissão cuja fórmula ainda não foi definida (só o Call Center tem: 20% do vendido). Nunca exibe número inventado. */
export function EmImplementacao() {
  return (
    <Badge variant="warning" title="A fórmula da comissão ainda não foi definida para este canal">
      Em implementação
    </Badge>
  );
}
