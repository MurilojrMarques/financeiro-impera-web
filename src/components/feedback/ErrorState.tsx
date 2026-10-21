import { CloudOff, RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/types/api.types';
import { NoPermissionState } from './NoPermissionState';
import { cn } from '@/lib/utils';

interface Props {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

/** Mensagem amigável por tipo de erro. Nunca mostra detalhes técnicos/infraestrutura ao usuário. */
export function errorMessage(error: unknown): { title: string; description: string } {
  if (error instanceof ApiError) {
    if (error.kind === 'network') return { title: 'Sem conexão com a API', description: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.' };
    if (error.kind === 'timeout') return { title: 'A API demorou para responder', description: 'A consulta excedeu o tempo limite. Tente novamente.' };
    if (error.kind === 'invalid-response') return { title: 'Resposta inesperada da API', description: 'Os dados recebidos não seguem o contrato esperado. Avise a equipe técnica.' };
    if (error.status === 429) return { title: 'Muitas requisições', description: 'Aguarde alguns segundos e tente novamente.' };
    if (error.status === 503) return { title: 'Serviço indisponível', description: 'A API está temporariamente indisponível. Tente novamente em instantes.' };
    if (error.status === 422) return { title: 'Filtros inválidos', description: error.message };
    if (error.status && error.status >= 500) return { title: 'Erro no servidor', description: 'Ocorreu um erro interno. Tente novamente; se persistir, avise a equipe técnica.' };
    return { title: 'Não foi possível carregar', description: error.message };
  }
  return { title: 'Não foi possível carregar', description: 'Ocorreu um erro inesperado.' };
}

export function ErrorState({ error, onRetry, className, compact }: Props) {
  if (error instanceof ApiError && error.isForbidden && error.code !== 'PASSWORD_CHANGE_REQUIRED') return <NoPermissionState />;
  const { title, description } = errorMessage(error);
  const offline = error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout');
  const Icon = offline ? CloudOff : TriangleAlert;
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-2 rounded-lg border border-negative/30 bg-negative/5 px-6 text-center', compact ? 'py-5' : 'py-10', className)}
    >
      <Icon className="size-6 text-negative" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-md text-xs text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw /> Tentar novamente
        </Button>
      )}
    </div>
  );
}

/** Falha de rede em tela cheia/bloco (mesmo visual, nome do contrato do escopo). */
export function ConnectionError(props: Omit<Props, 'error'>) {
  return <ErrorState {...props} error={new ApiError('Sem conexão', 'network')} />;
}
