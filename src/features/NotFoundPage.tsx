import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Página não encontrada"
      description="O endereço acessado não existe ou foi movido."
      action={<Button asChild variant="secondary" size="sm"><Link to="/dashboard">Ir para a visão executiva</Link></Button>}
    />
  );
}
