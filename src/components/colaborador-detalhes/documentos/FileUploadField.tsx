import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateUploadFile } from '@/utils/uploadValidation';
import { FileTypeIcon } from './FileTypeIcon';

const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv';
const DEFAULT_MAX_SIZE_MB = 10;

interface FileUploadFieldProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  maxSizeMB?: number;
  accept?: string;
  disabled?: boolean;
  /** Estado indeterminado — a API de upload usada (Supabase Storage) não
   * expõe progresso real, então não simulamos percentual falso. */
  uploading?: boolean;
  className?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Campo de upload de arquivo reutilizável: clique ou arraste-e-solte, com
 * preview do arquivo selecionado (ícone por tipo + nome + tamanho) e opção
 * de remover antes de salvar. Não faz o upload em si — só entrega o `File`
 * pro chamador via `onFileChange`; o upload real acontece no submit do
 * formulário (ver documentUploadService.ts), pra manter "validar → enviar →
 * salvar metadado" num fluxo só, com possibilidade de rollback. */
export function FileUploadField({
  file, onFileChange, maxSizeMB = DEFAULT_MAX_SIZE_MB, accept = DEFAULT_ACCEPT, disabled, uploading, className,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptFile = (candidate: File) => {
    try {
      validateUploadFile(candidate, { maxSizeMB });
      setError(null);
      onFileChange(candidate);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Arquivo inválido.');
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) acceptFile(picked);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled || uploading) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) acceptFile(dropped);
  };

  if (file) {
    return (
      <div className={cn('rounded-xl border border-border/40 bg-muted/10 p-3', className)}>
        <div className="flex items-center gap-2.5">
          <FileTypeIcon url={file.name} mimeType={file.type} className="h-6 w-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{file.name}</p>
            <p className="text-[11px] text-muted-foreground">{uploading ? 'Enviando arquivo...' : formatSize(file.size)}</p>
          </div>
          {uploading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <button
              type="button"
              onClick={() => onFileChange(null)}
              disabled={disabled}
              className="text-xs font-medium text-destructive hover:underline shrink-0 disabled:opacity-50"
            >
              Remover
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-xl border border-dashed p-5 text-center transition-colors cursor-pointer',
          dragActive ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/40',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className,
        )}
      >
        <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1.5" />
        <p className="text-xs font-medium">Arraste um arquivo aqui</p>
        <p className="text-[11px] text-muted-foreground">ou selecione do computador</p>
        <p className="text-[10px] text-muted-foreground mt-2">PDF, JPG, PNG, DOCX, XLSX • até {maxSizeMB}MB</p>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleInputChange} disabled={disabled} />
      </div>
      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
    </div>
  );
}
