/**
 * ============================================================================
 * PORTAS DO PIPELINE PARA O SUPABASE (service role)
 * ============================================================================
 * Implementação única usada por:
 *   • `training-image-generate`  (solicitação manual autenticada)
 *   • `training-image-dispatch`  (worker automático da fila)
 *
 * Nenhuma regra de negócio aqui: apenas leitura escopada por empresa, claim
 * atômico, upload no bucket privado e atualização do registro. A proteção
 * contra cobrança duplicada fica no pipeline + `claim_training_image`.
 * ============================================================================
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  TENTATIVAS_MAX_PIPELINE,
  type DepsPipelineCapa,
  type EntradaGeracaoCapa,
} from './pipeline.ts';
import { montarCaminhoImagem, TRAINING_IMAGES_BUCKET } from './storagePath.ts';
import type {
  ClaimTrainingImageResult,
  ConteudoTreinamento,
  TrainingContentType,
  TrainingImageProvider,
} from './types.ts';

export type TrainingAdminClient = SupabaseClient<any, 'public', any>;

/** Carrega o conteúdo ESCOPADO pela empresa (nunca confia no UUID do cliente). */
export async function carregarConteudoTreinamento(
  admin: TrainingAdminClient,
  entrada: EntradaGeracaoCapa
): Promise<ConteudoTreinamento | null> {
  if (entrada.contentType === 'course') {
    const { data } = await admin
      .from('catalogo_cursos')
      .select('id, nome, descricao, categoria, modalidade, carga_horaria, obrigatorio, empresa_id')
      .eq('id', entrada.contentId)
      .eq('empresa_id', entrada.empresaId)
      .maybeSingle();
    if (!data) return null;
    return {
      contentType: 'course',
      contentId: String(data.id),
      empresaId: String(data.empresa_id),
      name: String(data.nome ?? ''),
      description: data.descricao ?? null,
      category: data.categoria ?? null,
      modality: data.modalidade ?? null,
      workloadHours: data.carga_horaria ?? null,
      mandatory: data.obrigatorio ?? null,
    };
  }

  if (entrada.contentType === 'learning_path') {
    // Somente colunas existentes: `trilhas_aprendizado` tem `nome` (não `titulo`).
    const { data } = await admin
      .from('trilhas_aprendizado')
      .select('id, nome, descricao, nivel, empresa_id')
      .eq('id', entrada.contentId)
      .eq('empresa_id', entrada.empresaId)
      .maybeSingle();
    if (!data) return null;

    const { data: vinculos } = await admin
      .from('trilhas_cursos')
      .select('ordem, curso:catalogo_cursos(nome)')
      .eq('trilha_id', entrada.contentId)
      .order('ordem', { ascending: true });

    const nomes = ((vinculos ?? []) as Array<{ curso?: { nome?: string | null } | null }>)
      .map((vinculo) => String(vinculo?.curso?.nome ?? '').trim())
      .filter(Boolean);

    return {
      contentType: 'learning_path',
      contentId: String(data.id),
      empresaId: String(data.empresa_id),
      name: String(data.nome ?? ''),
      description: data.descricao ?? null,
      level: data.nivel ?? null,
      linkedCourseNames: nomes,
    };
  }

  // Defesa: nunca gera para turma/certificado (herdam o curso).
  return null;
}


/**
 * Dependências do pipeline ligadas ao Supabase. Toda escrita usa service role.
 * `operation_id` é persistido em sucesso e em falha para rastreabilidade.
 */
export function criarDepsSupabase(
  admin: TrainingAdminClient,
  provider: TrainingImageProvider,
  opcoes: { claimStaleAfter?: string } = {}
): DepsPipelineCapa {
  return {
    provider,
    carregarConteudo: (entrada) => carregarConteudoTreinamento(admin, entrada),
    claim: (dados) => reivindicarTrabalho(admin, dados, opcoes.claimStaleAfter),

    async registrarOperacao({ id, operationId }) {
      const { error } = await admin
        .from('training_images')
        .update({ operation_id: operationId })
        .eq('id', id);
      if (error) throw error;
    },

    async enviarImagem({ empresaId, contentType, contentId, bytes, mimeType, extensao }) {
      const caminho = montarCaminhoImagem({ empresaId, contentType, contentId, extensao });
      const { error } = await admin.storage.from(TRAINING_IMAGES_BUCKET).upload(caminho, bytes, {
        contentType: mimeType,
        upsert: true,
      });
      if (error) throw error;
      return caminho;
    },

    async atualizarSucesso({
      id,
      storagePath,
      provider: providerId,
      model,
      promptVersion,
      operationId,
    }) {
      const { error } = await admin
        .from('training_images')
        .update({
          status: 'succeeded',
          storage_path: storagePath,
          provider: providerId,
          model,
          prompt_version: promptVersion,
          operation_id: operationId,
          completed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', id);
      if (error) throw error;
    },

    async atualizarFalha({ id, erro, permanente, operationId }) {
      const { error } = await admin
        .from('training_images')
        .update({
          status: 'failed',
          last_error: erro,
          operation_id: operationId,
          completed_at: new Date().toISOString(),
          provider: provider.id,
          // Erro permanente esgota as tentativas: repetir não resolveria (e,
          // quando o resultado é desconhecido, poderia cobrar duas vezes).
          ...(permanente ? { attempts: TENTATIVAS_MAX_PIPELINE } : {}),
        })
        .eq('id', id);
      if (error) throw error;
    },
  };
}

async function reivindicarTrabalho(
  admin: TrainingAdminClient,
  dados: {
    empresaId: string;
    contentType: TrainingContentType;
    contentId: string;
    contentHash: string;
    promptVersion: string;
    maxAttempts: number;
  },
  staleAfter?: string
): Promise<ClaimTrainingImageResult> {
  const { data, error } = await admin.rpc('claim_training_image', {
    p_empresa_id: dados.empresaId,
    p_content_type: dados.contentType,
    p_content_id: dados.contentId,
    p_content_hash: dados.contentHash,
    p_prompt_version: dados.promptVersion,
    p_max_attempts: dados.maxAttempts,
    ...(staleAfter ? { p_stale_after: staleAfter } : {}),
  });
  if (error) throw error;
  const linha = Array.isArray(data) ? data[0] : data;
  return {
    reclamado: Boolean(linha?.reclamado),
    id: linha?.id ?? null,
    status: linha?.status ?? null,
    attempts: linha?.attempts ?? null,
  };
}
