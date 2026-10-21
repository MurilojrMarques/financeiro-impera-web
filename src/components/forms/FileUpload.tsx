import { FileText, Paperclip, X } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/formatters';

/** Tipos aceitos e limite (o backend valida o MIME REAL e o tamanho de novo; aqui é só feedback imediato). */
export const ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg'] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateFile(file: File, maxBytes = MAX_UPLOAD_BYTES): string | null {
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) return 'Formato não permitido. Envie PDF, PNG ou JPEG.';
  if (file.size > maxBytes) return `Arquivo maior que o limite de ${formatBytes(maxBytes)}.`;
  if (file.size === 0) return 'O arquivo está vazio.';
  return null;
}

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string | null;
  id?: string;
  maxBytes?: number;
  disabled?: boolean;
}

export function FileUpload({ file, onChange, error, id, maxBytes = MAX_UPLOAD_BYTES, disabled }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const describedBy = error ? `${id ?? 'file'}-erro` : undefined;
  return (
    <div className="space-y-1.5">
      <input
        ref={ref}
        id={id}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        className="sr-only"
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onChange(f);
          e.target.value = ''; // permite escolher o mesmo arquivo de novo após remover
        }}
      />
      {file ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[13px]">
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
          </span>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => onChange(null)} aria-label="Remover arquivo" disabled={disabled}>
            <X />
          </Button>
        </div>
      ) : (
        <Button variant="secondary" className="w-full justify-start font-normal text-muted-foreground" onClick={() => ref.current?.click()} disabled={disabled}>
          <Paperclip />
          <span className="min-w-0 truncate">Anexar PDF ou imagem (máx. {formatBytes(maxBytes)})</span>
        </Button>
      )}
      {error && (
        <p id={describedBy} role="alert" className="text-xs text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
