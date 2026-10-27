import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Notice } from '@/components/feedback/Notice';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/hooks/usePermissions';
import { retryPolicy } from '@/hooks/useReport';
import { formatInteger } from '@/lib/formatters';
import { rhService } from '@/services/rh.service';
import { ApiError } from '@/types/api.types';
import type { RhFolhaListada } from '@/types/rh.types';
import { mesAtual, mesLabel } from './rh-format';

/** Lista as folhas por mês. O RH gera a do mês; RH e CEO consultam. */
export default function FolhaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { rhCan } = usePermissions();
  const editar = rhCan('folha.editar');
  const [gerar, setGerar] = useState(false);
  const [mes, setMes] = useState(mesAtual());

  const q = useQuery({ queryKey: ['rh', 'folhas'], retry: retryPolicy, queryFn: async ({ signal }) => (await rhService.folhas(signal)).data });

  const criar = useMutation({
    mutationFn: () => rhService.gerarFolha(mes),
    onSuccess: (r) => {
      toast.success(`Folha de ${mesLabel(mes)} gerada: ${r.data.pessoas} pessoas.`);
      void qc.invalidateQueries({ queryKey: ['rh', 'folhas'] });
      setGerar(false);
      navigate(`/rh/folha/${mes}`);
    },
    onError: (e) => toast.error(e instanceof ApiError && e.status === 409 ? e.message : 'Não foi possível gerar a folha.'),
  });

  const cols: Column<RhFolhaListada>[] = [
    { id: 'mes', header: 'Mês', mobile: 'title', cell: (f) => <span className="font-medium">{mesLabel(f.competencia)}</span> },
    { id: 'status', header: 'Situação', mobile: 'value', cell: (f) => (f.status === 'FECHADA' ? <Badge variant="positive">Fechada</Badge> : <Badge variant="warning">Aberta</Badge>) },
    { id: 'pessoas', header: 'Pessoas', align: 'right', cell: (f) => formatInteger(f.pessoas) },
    { id: 'total', header: 'Total da folha', align: 'right', cell: (f) => <CurrencyValue centavos={f.totalCentavos} /> },
    { id: 'pago', header: 'Pago', align: 'right', cell: (f) => <CurrencyValue centavos={f.pagoCentavos} /> },
    { id: 'pend', header: 'A pagar', align: 'right', cell: (f) => <CurrencyValue centavos={f.pendenteCentavos} /> },
  ];

  if (q.isError && !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;

  return (
    <>
      <PageHeader
        title="Folha de pagamento"
        description="Salário do mês (proporcional a 30 dias para quem entrou ou saiu), mais comissão, bônus e desconto lançados pelo RH."
        actions={editar ? <Button onClick={() => setGerar(true)}><Plus /> Gerar folha de um mês</Button> : undefined}
      />
      {!editar && <Notice tone="info">Você pode consultar as folhas. Quem lança comissão, bônus e pagamento é o RH.</Notice>}

      <DataTable
        caption="Folhas por mês"
        columns={cols}
        data={q.data}
        rowKey={(f) => f.competencia}
        loading={q.isPending}
        onRowClick={(f) => navigate(`/rh/folha/${f.competencia}`)}
        dense
        empty={{ title: 'Nenhuma folha gerada ainda.', description: editar ? 'Use "Gerar folha de um mês" para começar.' : undefined }}
      />

      <Dialog open={gerar} onOpenChange={setGerar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar folha</DialogTitle>
            <DialogDescription>Inclui quem estava ativo no mês, com o salário vigente. Quem entrou ou saiu no meio do mês recebe proporcional. Se o mês já existir, só entram os que faltam.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="f-mes">Mês</Label>
            <Input id="f-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGerar(false)}>Cancelar</Button>
            <Button disabled={!/^\d{4}-\d{2}$/.test(mes) || criar.isPending} onClick={() => criar.mutate()}>{criar.isPending && <LoaderCircle className="animate-spin" />} Gerar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
