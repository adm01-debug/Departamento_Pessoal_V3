import { supabase } from '@/integrations/supabase/client';
import { validateUploadFile, sanitizeFileName } from '@/utils/uploadValidation';

export interface UploadedFileMeta {
  storage_path: string;
  nome_arquivo: string;
  tamanho: number;
  mime_type: string;
}

function extensionOf(fileName: string): string {
  const parts = fileName.split('.');
  const ext = parts.length > 1 ? parts.pop() : undefined;
  return ext ? ext.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin' : 'bin';
}

/** Valida e envia um arquivo para um bucket privado do Storage, sob um path
 * previsível mas não-adivinhável (uuid), estruturado por empresa/colaborador
 * para manter isolamento de tenant no nível do path. Não salva URL assinada
 * em lugar nenhum — quem chama recebe só o `storage_path` persistente. */
export async function uploadDocumentFile(
  file: File,
  opts: { bucket: string; empresaId: string; colaboradorId: string; categoria: string; maxSizeMB?: number },
): Promise<UploadedFileMeta> {
  validateUploadFile(file, { maxSizeMB: opts.maxSizeMB ?? 10 });

  const ext = extensionOf(file.name);
  const storagePath = `${opts.empresaId}/${opts.colaboradorId}/${opts.categoria}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(opts.bucket).upload(storagePath, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;

  return {
    storage_path: storagePath,
    nome_arquivo: sanitizeFileName(file.name),
    tamanho: file.size,
    mime_type: file.type || 'application/octet-stream',
  };
}

/** Remove um objeto do Storage. Usado tanto no rollback de upload (quando o
 * insert no banco falha depois do upload ter ido) quanto na exclusão normal
 * de um documento que tem `storage_path`. */
export async function removeDocumentFile(bucket: string, storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) throw error;
}

/** Gera uma URL assinada temporária para abrir/baixar um objeto privado. */
export async function getDocumentSignedUrl(bucket: string, storagePath: string, expiresInSeconds = 60 * 60): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Não foi possível gerar o link de acesso ao arquivo.');
  return data.signedUrl;
}

/** Resolve a URL utilizável de um documento: se tiver `storage_path` (fluxo
 * novo), gera uma signed URL sob demanda; senão cai para `url`/`arquivo_url`
 * legado (link externo ou signed URL antiga salva permanentemente por
 * versões anteriores do formulário). Nunca lança para documento sem nenhum
 * dos dois — retorna null e quem chama decide como avisar o usuário. */
export async function resolveDocumentUrl(
  doc: { storage_path?: string | null; url?: string | null },
  bucket: string,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  if (doc.storage_path) return getDocumentSignedUrl(bucket, doc.storage_path, expiresInSeconds);
  if (doc.url) return doc.url;
  return null;
}
