const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif',
  'js', 'vbs', 'wsf', 'ps1', 'sh', 'bash',
  'php', 'asp', 'aspx', 'jsp', 'cgi',
  'svg', 'html', 'htm', 'xhtml',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateUploadFile(file: File, options?: { maxSizeMB?: number }): void {
  const maxSize = (options?.maxSizeMB ?? 10) * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(`Arquivo excede o limite de ${options?.maxSizeMB ?? 10}MB`);
  }

  if (file.size === 0) {
    throw new Error('Arquivo está vazio');
  }

  // Check ALL extensions in the filename (double-extension attack: file.pdf.exe)
  const parts = file.name.split('.');
  for (let i = 1; i < parts.length; i++) {
    const ext = parts[i].toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      throw new Error(`Tipo de arquivo não permitido: .${ext}`);
    }
  }

  if (file.type && !ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    throw new Error(`Tipo MIME não permitido: ${file.type}`);
  }

  // Null byte injection in filename
  if (file.name.includes('\x00')) {
    throw new Error('Nome de arquivo inválido');
  }
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^\w.\-\s]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 200);
}
