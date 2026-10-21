import { TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface State {
  failed: boolean;
}

/** Última barreira: um erro de renderização não derruba a aplicação inteira nem expõe detalhes técnicos. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // sem registro de dados/tokens no console em produção
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <TriangleAlert className="size-8 text-negative" aria-hidden="true" />
        <h1 className="text-lg font-semibold">Algo deu errado</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Ocorreu um erro inesperado ao exibir esta tela. Seus dados não foram afetados.</p>
        <Button onClick={() => window.location.assign('/')}>Voltar ao início</Button>
      </div>
    );
  }
}
