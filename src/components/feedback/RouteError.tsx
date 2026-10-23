import { TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const RECARREGOU = 'impera:recarregou-por-versao';

/** Depois de uma publicação, quem está com a página aberta pede arquivos antigos que não existem mais. */
const erroDeVersao = (e: unknown): boolean => /dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically/i.test(e instanceof Error ? e.message : String(e));

/**
 * Erro de rota. Se for só uma versão nova publicada, recarrega sozinho UMA vez (o navegador busca os arquivos novos);
 * qualquer outro erro mostra uma mensagem amigável em vez da tela técnica do React Router.
 */
export function RouteError() {
  const error = useRouteError();
  const versaoNova = erroDeVersao(error);

  useEffect(() => {
    if (!versaoNova) return;
    try {
      if (sessionStorage.getItem(RECARREGOU)) return;
      sessionStorage.setItem(RECARREGOU, '1');
    } catch {
      return;
    }
    window.location.reload();
  }, [versaoNova]);

  return (
    <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <TriangleAlert className="size-8 text-negative" aria-hidden="true" />
      <h1 className="text-lg font-semibold">{versaoNova ? 'Há uma versão nova do painel' : 'Algo deu errado'}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {versaoNova ? 'Atualize a página para carregar a versão mais recente.' : 'Ocorreu um erro inesperado ao exibir esta tela. Seus dados não foram afetados.'}
      </p>
      <Button onClick={() => window.location.reload()}>Atualizar a página</Button>
    </div>
  );
}
