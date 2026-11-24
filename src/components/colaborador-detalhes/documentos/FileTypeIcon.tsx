import { cn } from '@/lib/utils';
import { getDocumentFileType } from '@/utils/documentFileType';

interface FileTypeIconProps {
  url?: string | null;
  mimeType?: string | null;
  tipo?: string | null;
  className?: string;
}

/** Pictograma colorido por família de arquivo (PDF vermelho, imagem verde,
 * Word azul, planilha verde, compactado âmbar, genérico neutro). */
export function FileTypeIcon({ url, mimeType, tipo, className }: FileTypeIconProps) {
  const { icon: Icon, iconClassName } = getDocumentFileType({ url, mime_type: mimeType, tipo });

  return <Icon className={cn('h-5 w-5', iconClassName, className)} aria-hidden="true" />;
}
