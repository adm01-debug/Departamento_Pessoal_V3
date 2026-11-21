import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { getDocumentSignedUrl, uploadDocumentFile, removeDocumentFile } from '@/services/documentUploadService';

/** Espelho de ponto devolvido assinado em papel (etapa 85). Uma linha por
 * colaborador e competência; RLS: só admin/RH da própria empresa. */
export type EspelhoPapel = Tables<'ponto_espelhos_papel'>;

export interface ColaboradorEspelho {
  id: string;
  nome_completo: string;
}

/** Digitalização do espelho assinado: bucket privado com policy por empresa
 * (path `{empresa_id}/...`), o mesmo dos documentos pessoais do colaborador. */
export const ESPELHO_PAPEL_BUCKET = 'documentos-colaboradores';

/** `YYYY-MM` (valor do input type=month) → `YYYY-MM-01` (coluna competencia). */
export function competenciaDoMes(mes: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new Error('Competência inválida.');
  return `${mes}-01`;
}

export async function listarColaboradoresAtivos(empresaId: string): Promise<ColaboradorEspelho[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome_completo')
    .eq('empresa_id', empresaId)
    .neq('status', 'desligado')
    .order('nome_completo');
  if (error) throw error;
  return (data ?? []) as ColaboradorEspelho[];
}

export async function listarEspelhosPapel(empresaId: string, competencia: string): Promise<EspelhoPapel[]> {
  const { data, error } = await supabase
    .from('ponto_espelhos_papel')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('competencia', competencia);
  if (error) throw error;
  return data ?? [];
}

/** Cria ou atualiza o registro do colaborador na competência. Só os campos
 * enviados em `patch` mudam numa linha já existente. */
export async function salvarEspelhoPapel(
  empresaId: string,
  colaboradorId: string,
  competencia: string,
  patch: Partial<Pick<EspelhoPapel, 'devolvido_em' | 'observacao' | 'arquivo_path'>>
): Promise<EspelhoPapel> {
  const { data, error } = await supabase
    .from('ponto_espelhos_papel')
    .upsert(
      { empresa_id: empresaId, colaborador_id: colaboradorId, competencia, ...patch },
      { onConflict: 'colaborador_id,competencia' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Envia a digitalização e grava o caminho; se a gravação falhar, apaga o arquivo. */
export async function anexarDigitalizacao(
  empresaId: string,
  colaboradorId: string,
  competencia: string,
  file: File
): Promise<EspelhoPapel> {
  const enviado = await uploadDocumentFile(file, {
    bucket: ESPELHO_PAPEL_BUCKET,
    empresaId,
    colaboradorId,
    categoria: 'espelho-ponto',
  });
  try {
    return await salvarEspelhoPapel(empresaId, colaboradorId, competencia, { arquivo_path: enviado.storage_path });
  } catch (e) {
    await removeDocumentFile(ESPELHO_PAPEL_BUCKET, enviado.storage_path).catch(() => {});
    throw e;
  }
}

export function urlDigitalizacao(arquivoPath: string): Promise<string> {
  return getDocumentSignedUrl(ESPELHO_PAPEL_BUCKET, arquivoPath, 60 * 10);
}
