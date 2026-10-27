import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/dates';
import { rhService } from '@/services/rh.service';
import type { RhStatusDocumento, RhTipoAlteracao, RhTipoDocumento } from '@/types/rh.types';

/** O backend devolve datas como instante UTC (meia-noite): só o dia importa. */
export const dia = (iso: string | null | undefined): string => (iso ? formatDate(iso.slice(0, 10)) : '—');

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
/** "2026-10" -> "Out/2026" */
export const mesLabel = (competencia: string | null | undefined): string => {
  const m = /^(\d{4})-(\d{2})$/.exec(competencia ?? '');
  return m ? `${MESES[Number(m[2]) - 1]}/${m[1]}` : '—';
};

export const mesAtual = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const TIPO_DOC: Record<RhTipoDocumento, string> = {
  NOTA_FISCAL: 'Nota fiscal',
  COMPROVANTE_PAGAMENTO: 'Comprovante de pagamento',
  CONTRATO: 'Contrato',
  OUTRO: 'Outro',
};

export const STATUS_DOC: Record<RhStatusDocumento, { label: string; variant: 'info' | 'positive' | 'negative' }> = {
  ENVIADO: { label: 'Aguardando revisão', variant: 'info' },
  APROVADO: { label: 'Aprovado', variant: 'positive' },
  REPROVADO: { label: 'Reprovado', variant: 'negative' },
};

export const TIPO_ALTERACAO: Record<RhTipoAlteracao, string> = {
  NOVO_COLABORADOR: 'Novo colaborador',
  SALARIO: 'Salário',
  CARGO: 'Cargo',
  DEPARTAMENTO: 'Departamento',
  GESTOR: 'Gestor',
  DESLIGAMENTO: 'Desligamento',
  MOVIMENTACAO: 'Promoção / reajuste',
  REMOVIDO_DA_ORIGEM: 'Sumiu do sistema de RH',
};

export const SENIORIDADE: Record<string, string> = { jr: 'Júnior', pl: 'Pleno', sr: 'Sênior' };
export const senioridadeLabel = (s: string | null | undefined): string => (s ? (SENIORIDADE[s] ?? s) : '—');

/** Baixa um arquivo protegido (o login vai no cabeçalho, então não dá para usar um link comum) e entrega ao navegador. */
export function baixar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Foto do colaborador (arquivo protegido): busca com o login e vira uma URL local. */
export function useFoto(id: string, tem: boolean) {
  return useQuery({
    queryKey: ['rh', 'foto', id],
    enabled: tem,
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: async () => URL.createObjectURL(await rhService.foto(id)),
  });
}
