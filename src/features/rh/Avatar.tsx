import { cn } from '@/lib/utils';
import { useFoto } from './rh-format';

const iniciais = (nome: string) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

/** Foto do colaborador (arquivo protegido); sem foto, as iniciais. */
export function Avatar({ id, nome, tem, className }: { id: string; nome: string; tem: boolean; className?: string }) {
  const foto = useFoto(id, tem);
  return foto.data ? (
    <img src={foto.data} alt="" className={cn('size-9 shrink-0 rounded-full border border-border object-cover', className)} />
  ) : (
    <span aria-hidden="true" className={cn('flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary', className)}>
      {iniciais(nome)}
    </span>
  );
}
