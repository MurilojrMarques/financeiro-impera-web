import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CurrencyValue } from '@/components/cards/CurrencyValue';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Notice } from '@/components/feedback/Notice';
import { ContentSection } from '@/components/layout/ContentSection';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { retryPolicy } from '@/hooks/useReport';
import { ApiError } from '@/types/api.types';
import { rhService } from '@/services/rh.service';
import type { RhColaborador, RhMovimentacao } from '@/types/rh.types';
import { Avatar } from './Avatar';
import { DocumentosLista } from './DocumentosPage';
import { PixCampo } from './Pix';
import { dia, senioridadeLabel } from './rh-format';

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-sm">{children || '—'}</dd>
    </div>
  );
}

/** Ficha de UM colaborador. A API decide o que vem (salário e dados pessoais só para quem pode); a tela mostra o que chegou. */
export function Ficha({ id, meuPerfil }: { id: string; meuPerfil?: boolean }) {
  const { rhCan, rhPapel } = usePermissions();
  const q = useQuery({ queryKey: ['rh', 'colaborador', id], retry: retryPolicy, queryFn: async ({ signal }) => (await rhService.colaborador(id, signal)).data });
  const c = q.data;
  const temSalario = c?.salarioCentavos !== undefined;

  const hist = useQuery({
    queryKey: ['rh', 'movimentacoes', id],
    enabled: temSalario,
    retry: retryPolicy,
    queryFn: async ({ signal }) => (await rhService.movimentacoes(id, signal)).data,
  });

  if (q.isError && !c) {
    if (q.error instanceof ApiError && q.error.status === 404) return <ErrorState error={q.error} compact />;
    return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  }

  const colunasHist: Column<RhMovimentacao>[] = [
    { id: 'data', header: 'Data', mobile: 'title', cell: (m) => dia(m.data) },
    { id: 'tipo', header: 'Tipo', cell: (m) => <Badge variant={m.tipo === 'PROMOCAO' ? 'gold' : 'info'}>{m.tipo === 'PROMOCAO' ? 'Promoção' : 'Reajuste'}</Badge> },
    { id: 'cargo', header: 'Cargo', mobile: 'full', cell: (m) => (m.cargoNovo && m.cargoNovo !== m.cargoAnterior ? `${m.cargoAnterior ?? '—'} → ${m.cargoNovo}` : '—') },
    { id: 'de', header: 'Salário anterior', align: 'right', cell: (m) => <CurrencyValue centavos={m.salarioAnteriorCentavos} /> },
    { id: 'para', header: 'Salário novo', align: 'right', mobile: 'value', cell: (m) => <CurrencyValue centavos={m.salarioNovoCentavos} /> },
    { id: 'obs', header: 'Observação', mobile: 'full', cell: (m) => m.obs ?? '—' },
  ];

  const equipeLink = !meuPerfil && (rhPapel === 'RH' || rhPapel === 'CEO' || rhPapel === 'GESTOR');

  return (
    <>
      {equipeLink && (
        <Link to="/rh/colaboradores" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar aos colaboradores
        </Link>
      )}

      <div className="flex items-center gap-4">
        {c ? <Avatar id={c.id} nome={c.nome} tem={!!c.foto} className="size-16 text-lg" /> : <Skeleton className="size-16 rounded-full" />}
        <div className="min-w-0">
          {c ? <h2 className="truncate text-xl font-semibold leading-tight">{c.nome}</h2> : <Skeleton className="h-6 w-56" />}
          {c && <p className="text-[13px] text-muted-foreground">{c.funcao ?? c.cargoBase ?? '—'} · {c.departamento}</p>}
          {c && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {c.ativo ? <Badge variant="positive">Ativo</Badge> : <Badge>Desligado em {dia(c.demissao)}</Badge>}
              {c.senioridade && <Badge variant="gold">{senioridadeLabel(c.senioridade)}{c.subnivel ? ` · nível ${c.subnivel}` : ''}</Badge>}
              {(c.tamanhoDaEquipe ?? 0) > 0 && <Badge variant="info">Gestor de {c.tamanhoDaEquipe} pessoa{c.tamanhoDaEquipe === 1 ? '' : 's'}</Badge>}
            </div>
          )}
        </div>
      </div>

      <ContentSection title="Dados">
        <DadosBasicos c={c} />
      </ContentSection>

      {c && c.cnpj !== undefined && (
        <ContentSection title="Dados pessoais e fiscais" description="Visível apenas para RH, CEO e para a própria pessoa.">
          <dl className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo rotulo="CNPJ">{c.cnpj}</Campo>
            <Campo rotulo="Chave PIX"><PixCampo colaboradorId={c.id} pix={c.pix} podeEditar={rhCan('pix.editar')} /></Campo>
            <Campo rotulo="Nascimento">{dia(c.nascimento)}</Campo>
            <Campo rotulo="Endereço">{c.endereco}</Campo>
            {c.demissao && <Campo rotulo="Motivo do desligamento">{c.motivoDemissao === 'voluntario' ? 'Voluntário' : c.motivoDemissao === 'involuntario' ? 'Involuntário' : c.motivoDemissao}</Campo>}
          </dl>
        </ContentSection>
      )}

      {temSalario && (
        <ContentSection title="Remuneração" description="Salário vigente e histórico de promoções e reajustes. Alterações são feitas no sistema de RH e chegam aqui sozinhas.">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Salário mensal atual</p>
            <p className="mt-1 text-2xl font-semibold text-primary"><CurrencyValue centavos={c?.salarioCentavos} /></p>
          </div>
          <DataTable
            caption="Histórico de promoções e reajustes"
            columns={colunasHist}
            data={hist.data}
            rowKey={(m) => m.id}
            loading={hist.isPending}
            error={hist.error}
            onRetry={() => void hist.refetch()}
            dense
            empty={{ title: 'Nenhuma promoção ou reajuste registrado.' }}
          />
        </ContentSection>
      )}

      {c && (meuPerfil || rhCan('salario.ver')) && (
        <ContentSection title="Notas fiscais e comprovantes" description={meuPerfil ? 'Suas notas fiscais enviadas e os comprovantes de pagamento.' : 'Documentos desta pessoa.'}>
          <DocumentosLista colaboradorId={c.id} fixo />
        </ContentSection>
      )}
    </>
  );
}

function DadosBasicos({ c }: { c: RhColaborador | undefined }) {
  if (!c) return <Skeleton className="h-32 w-full" />;
  return (
    <dl className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
      <Campo rotulo="E-mail">{c.email}</Campo>
      <Campo rotulo="Celular">{c.celular}</Campo>
      <Campo rotulo="Gestor">{c.gestor ? <Link to={`/rh/colaboradores/${c.gestor.id}`} className="text-primary hover:underline">{c.gestor.nome}</Link> : null}</Campo>
      <Campo rotulo="Cargo">{c.cargoBase}</Campo>
      <Campo rotulo="Função">{c.funcao}</Campo>
      <Campo rotulo="Departamento">{c.departamento}</Campo>
      <Campo rotulo="Início">{dia(c.inicio)}</Campo>
      <Campo rotulo="Camiseta">{c.camiseta}</Campo>
      {c.contratoObs !== undefined && <Campo rotulo="Contrato (anotação)">{c.contratoObs}</Campo>}
    </dl>
  );
}

export default function ColaboradorDetalhePage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/rh/colaboradores" replace />;
  return <Ficha id={id} />;
}

/** "Meu perfil": o cadastro do próprio usuário (o login está ligado a um colaborador). */
export function MeuPerfilPage() {
  const eu = useQuery({ queryKey: ['rh', 'eu'], retry: retryPolicy, queryFn: async ({ signal }) => (await rhService.eu(signal)).data });
  if (eu.isError) {
    return (
      <Notice tone="warning">
        Este login ainda não está ligado a um cadastro de colaborador. Peça ao RH para vincular a sua conta.
      </Notice>
    );
  }
  if (!eu.data) return <Skeleton className="h-48 w-full" />;
  return <Ficha id={eu.data.colaborador.id} meuPerfil />;
}
