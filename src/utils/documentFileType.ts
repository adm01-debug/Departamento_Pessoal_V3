import type { LucideIcon } from 'lucide-react';
import { FileText, FileImage, FileSpreadsheet, FileArchive, File as FileGenericIcon } from 'lucide-react';

export type DocFileKind = 'pdf' | 'image' | 'word' | 'excel' | 'archive' | 'unknown';

const EXTENSION_KIND: Record<string, DocFileKind> = {
  pdf: 'pdf',
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', gif: 'image',
  doc: 'word', docx: 'word',
  xls: 'excel', xlsx: 'excel', csv: 'excel',
  zip: 'archive', rar: 'archive', '7z': 'archive',
};

// Fallback usado apenas quando não há extensão identificável (nem por URL,
// nem por mime_type) — tipos contratuais/textuais tendem a ser PDF na prática.
const TIPO_FALLBACK_KIND: Record<string, DocFileKind> = {
  'Contrato de Trabalho': 'pdf',
  'Aditivo Contratual': 'pdf',
  'Acordo de Confidencialidade': 'pdf',
  'Exame Médico (ASO)': 'pdf',
};

const MIME_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/csv': 'csv',
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar',
};

export const DOC_KIND_STYLE: Record<DocFileKind, { icon: LucideIcon; iconClassName: string }> = {
  pdf: { icon: FileText, iconClassName: 'text-destructive' },
  image: { icon: FileImage, iconClassName: 'text-success' },
  word: { icon: FileText, iconClassName: 'text-info' },
  excel: { icon: FileSpreadsheet, iconClassName: 'text-success' },
  archive: { icon: FileArchive, iconClassName: 'text-warning' },
  unknown: { icon: FileGenericIcon, iconClassName: 'text-muted-foreground' },
};

/** Extrai a extensão do nome do arquivo a partir da URL, ignorando query
 * string/hash (signed URLs do Supabase costumam ter `?token=...`). */
export function getUrlExtension(url?: string | null): string {
  if (!url) return '';
  const withoutParams = url.split(/[?#]/)[0];
  const fileName = withoutParams.split('/').pop() || '';
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
}

/** Determina ícone + cor do documento: 1) extensão real da URL, 2) mime_type
 * (quando disponível), 3) heurística pelo `tipo` cadastrado, 4) genérico. */
export function getDocumentFileType(doc: { url?: string | null; mime_type?: string | null; tipo?: string | null }) {
  const ext = getUrlExtension(doc.url) || MIME_EXTENSION[doc.mime_type || ''] || '';
  const kind = EXTENSION_KIND[ext] ?? TIPO_FALLBACK_KIND[doc.tipo || ''] ?? 'unknown';
  return DOC_KIND_STYLE[kind];
}
