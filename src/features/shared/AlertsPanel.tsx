import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatInteger } from '@/lib/formatters';
import type { Alerta } from '@/types/financial.types';

const ICON = { info: Info, aviso: TriangleAlert, critico: CircleAlert } as const;
const VARIANT = { info: 'info', aviso: 'warning', critico: 'negative' } as const;

/**
 * Avisos sobre os dados: valores estimados, campos ausentes, conciliação incompleta e limitações conhecidas.
 * Transparência é obrigatória em um dashboard financeiro.
 */
export function AlertsPanel({ alertas, title = 'Avisos sobre os dados' }: { alertas: Alerta[] | undefined; title?: string }) {
  if (!alertas || alertas.length === 0) return null;
  return (
    <Card className="print-break-avoid">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Como ler os números deste período</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {alertas.map((a) => {
            const Icon = ICON[a.severidade];
            return (
              <li key={a.codigo} className="flex items-start gap-2 text-[13px]">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>
                  {a.mensagem}
                  {a.quantidade !== undefined && <Badge variant={VARIANT[a.severidade]} className="ml-2">{formatInteger(a.quantidade)}</Badge>}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
