import { PageHeader } from '@/components/layout/PageHeader';
import { AccountPanel } from '@/features/configuracoes/AccountPanel';

/** Conta do usuário no módulo de RH: dados da conta, troca de senha e sessões (mesmo painel das Configurações do financeiro). */
export default function ContaPage() {
  return (
    <>
      <PageHeader title="Minha conta" description="Dados de acesso, troca de senha e sessões ativas." />
      <AccountPanel />
    </>
  );
}
