import { ShieldAlert } from 'lucide-react';
import { EmptyState } from './EmptyState';

export function NoPermissionState({ description }: { description?: string }) {
  return (
    <EmptyState
      icon={<ShieldAlert className="size-7" />}
      title="Acesso negado"
      description={description ?? 'Seu perfil não tem permissão para ver esta área. Se precisar de acesso, fale com um administrador.'}
    />
  );
}
