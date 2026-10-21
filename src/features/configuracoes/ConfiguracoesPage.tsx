import { useState } from 'react';
import { FilterToolbar } from '@/components/filters/FilterToolbar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Segmented } from '@/components/ui/segmented';
import { usePermissions } from '@/hooks/usePermissions';
import { AccountPanel } from './AccountPanel';
import { AuditPanel } from './AuditPanel';
import { ClassificationPanel } from './ClassificationPanel';
import { UsersPanel } from './UsersPanel';

type Aba = 'conta' | 'usuarios' | 'classificacao' | 'auditoria';

export default function ConfiguracoesPage() {
  const { can } = usePermissions();
  const [aba, setAba] = useState<Aba>('conta');
  const opcoes: { value: Aba; label: string }[] = [
    { value: 'conta', label: 'Minha conta' },
    ...(can('usuarios.admin') ? [{ value: 'usuarios' as Aba, label: 'Usuários' }] : []),
    ...(can('classificacoes.ver') ? [{ value: 'classificacao' as Aba, label: 'Classificação de origens' }] : []),
    ...(can('usuarios.admin') ? [{ value: 'auditoria' as Aba, label: 'Auditoria' }] : []),
  ];

  return (
    <>
      <PageHeader title="Configurações e administração" description="Conta, usuários, regras de classificação e auditoria. As permissões são sempre validadas pelo servidor." />
      {opcoes.length > 1 && <div className="no-print"><Segmented label="Seção de configurações" value={aba} onChange={setAba} options={opcoes} /></div>}
      {aba === 'classificacao' && <FilterToolbar showCompare={false} showCriterio={false} extras={[]} />}
      {aba === 'conta' && <AccountPanel />}
      {aba === 'usuarios' && <UsersPanel />}
      {aba === 'classificacao' && <ClassificationPanel />}
      {aba === 'auditoria' && <AuditPanel />}
    </>
  );
}
