/**
 * ============================================================================
 * PIPELINE DE GERAÇÃO — orquestração pura e testável (sem Deno, sem Supabase).
 *
 * ORDEM (e por que ela importa)
 *   1. carrega o conteúdo ESCOPOADO pela empresa (o UUID do cliente é dado não
 *      confiável);
 *   2. reconstrói o briefing no servidor (nunca usa prompt do navegador);
 *   3. calcula `contentHash` (SHA-256) da versão do conteúdo;
 *   4. `claim_training_image` ATÔMICO: só um worker recebe `reclamado = true`;
 *   5. chama o provedor apenas se reclamou o trabalho;
 *   6. valida a imagem (magic bytes/tamanho) — defesa em profundidade;
 *   7. grava no Storage privado e marca `succeeded`;
 *   8. em falha, marca `failed` com mensagem segura (sem chave/URL).
 *
 * GARANTIAS
 *   • nenhuma chamada ao provedor quando já existe capa para o mesmo hash,
 *     quando há trabalho em andamento ou quando o limite de tentativas acabou;
 *   • nunca lança: devolve um resultado estável para a função mapear em HTTP;
 *   • não depende de `waitUntil`/memória: o estado vive em `training_images`.
 * ============================================================================
 */
import { DESCRICAO_MAX, montarBriefingVisual, sanearTexto } from './briefing';
import { sha256Hex } from './hash';
import { mensagemSegura, validarImagemGerada } from './imageValidation';
import {
  TRAINING_CONTENT_TYPES,
  TrainingImageProviderError,
  type ClaimTrainingImageResult,
  type ConteudoTreinamento,
  type TrainingContentType,
  type TrainingImagePipelineResult,
  type TrainingImageProvider,
} from './types';

export interface EntradaGeracaoCapa {
  empresaId: string;
  contentType: TrainingContentType;
  contentId: string;
}

export interface DepsPipelineCapa {
  /** Busca escopada por empresa. `null` cobre “não existe” e “não é sua”. */
  carregarConteudo: (entrada: EntradaGeracaoCapa) => Promise<ConteudoTreinamento | null>;
  /** RPC `claim_training_image` (atômica, service role). */
  claim: (dados: {
    empresaId: string;
    contentType: TrainingContentType;
    contentId: string;
    contentHash: string;
    promptVersion: string;
    maxAttempts: number;
  }) => Promise<ClaimTrainingImageResult>;
  provider: TrainingImageProvider;
  /** Upload no bucket privado; devolve o caminho persistível. */
  enviarImagem: (dados: {
    empresaId: string;
    contentType: TrainingContentType;
    contentId: string;
    bytes: Uint8Array;
    mimeType: string;
    extensao: 'webp' | 'png' | 'jpeg';
  }) => Promise<string>;
  atualizarSucesso: (dados: {
    id: string;
    storagePath: string;
    provider: string;
    model: string;
    promptVersion: string;
  }) => Promise<void>;
  atualizarFalha: (dados: { id: string; erro: string; permanente: boolean }) => Promise<void>;
}

export const TENTATIVAS_MAX_PIPELINE = 3;

/** Hash canônico do conteúdo — MESMA regra do cliente (`hashConteudo`). */
export function hashConteudoServidor(conteudo: ConteudoTreinamento): string {
  const base = [
    conteudo.contentType,
    sanearTexto(conteudo.name),
    sanearTexto(conteudo.description, DESCRICAO_MAX),
    sanearTexto(conteudo.category, 80),
    sanearTexto(conteudo.level, 40),
    (conteudo.linkedCourseNames ?? []).map((nome) => sanearTexto(nome, 80)).join(';'),
  ].join('|');
  return sha256Hex(base);
}

export function operationIdDe(conteudo: ConteudoTreinamento, contentHash: string): string {
  return `ti_${sha256Hex(
    `${conteudo.empresaId}|${conteudo.contentType}|${conteudo.contentId}|${contentHash}`
  ).slice(0, 32)}`;
}


export async function gerarCapaDeTreinamento(
  entrada: EntradaGeracaoCapa,
  deps: DepsPipelineCapa
): Promise<TrainingImagePipelineResult> {
  if (!entrada.empresaId || !entrada.contentId || !TRAINING_CONTENT_TYPES.includes(entrada.contentType)) {
    return { gerado: false, motivo: 'conteudo_inexistente' };
  }

  const conteudo = await deps.carregarConteudo(entrada);
  if (!conteudo) return { gerado: false, motivo: 'conteudo_inexistente' };
  // Defesa extra: o registro carregado tem de ser da empresa pedida.
  if (conteudo.empresaId !== entrada.empresaId) return { gerado: false, motivo: 'conteudo_inexistente' };

  const briefing = montarBriefingVisual({
    tipo: conteudo.contentType,
    nome: conteudo.name,
    descricao: conteudo.description,
    categoria: conteudo.category,
    nivel: conteudo.level,
    cursosVinculados: conteudo.linkedCourseNames,
  });
  const contentHash = hashConteudoServidor(conteudo);
  const operationId = operationIdDe(conteudo, contentHash);

  const claim = await deps.claim({
    empresaId: entrada.empresaId,
    contentType: entrada.contentType,
    contentId: entrada.contentId,
    contentHash,
    promptVersion: briefing.versao,
    maxAttempts: TENTATIVAS_MAX_PIPELINE,
  });

  if (!claim.reclamado || !claim.id) {
    return motivoDoClaim(claim.status, claim.attempts);
  }

  // Provedor desligado: libera o trabalho como falha imediata (sem custo) em
  // vez de deixar uma linha “pending” eterna.
  if (!deps.provider.configured) {
    await deps.atualizarFalha({ id: claim.id, erro: 'provedor_desativado', permanente: true });
    return { gerado: false, motivo: 'provedor_desativado' };
  }

  let artefato;
  try {
    artefato = await deps.provider.generate({
      contentType: conteudo.contentType,
      contentId: conteudo.contentId,
      empresaId: conteudo.empresaId,
      operationId,
      contentHash,
      promptVersion: briefing.versao,
      name: conteudo.name,
      description: conteudo.description,
      category: conteudo.category,
      modality: conteudo.modality,
      workloadHours: conteudo.workloadHours,
      level: conteudo.level,
      mandatory: conteudo.mandatory,
      linkedCourseNames: conteudo.linkedCourseNames,
      sourceContentId: conteudo.sourceContentId,
      artDirection: {
        assunto: briefing.assunto,
        cena: briefing.cena,
        elementos: briefing.elementos,
        paleta: briefing.paleta,
        composicao: briefing.composicao,
        restricoes: briefing.restricoes,
        versao: briefing.versao,
        ...(briefing.referencia ? { referencia: briefing.referencia } : {}),
      },
    });
  } catch (erro) {
    const permanente = erro instanceof TrainingImageProviderError ? erro.retryable === false : false;
    const mensagem = mensagemSegura(erro);
    await deps.atualizarFalha({ id: claim.id, erro: mensagem, permanente });
    return { gerado: false, motivo: 'falha_no_provedor', erro: mensagem };
  }

  let imagem;
  try {
    imagem = validarImagemGerada(artefato.bytes);
  } catch (erro) {
    const mensagem = mensagemSegura(erro);
    await deps.atualizarFalha({ id: claim.id, erro: mensagem, permanente: true });
    return { gerado: false, motivo: 'imagem_invalida', erro: mensagem };
  }

  let storagePath: string;
  try {
    storagePath = await deps.enviarImagem({
      empresaId: conteudo.empresaId,
      contentType: conteudo.contentType,
      contentId: conteudo.contentId,
      bytes: imagem.bytes,
      mimeType: imagem.mimeType,
      extensao: imagem.extensao,
    });
  } catch (erro) {
    const mensagem = mensagemSegura(erro);
    await deps.atualizarFalha({ id: claim.id, erro: mensagem, permanente: false });
    return { gerado: false, motivo: 'falha_no_upload', erro: mensagem };
  }

  try {
    await deps.atualizarSucesso({
      id: claim.id,
      storagePath,
      provider: artefato.providerId,
      model: artefato.model,
      promptVersion: artefato.promptVersion,
    });
  } catch (erro) {
    const mensagem = mensagemSegura(erro);
    await deps.atualizarFalha({ id: claim.id, erro: mensagem, permanente: false });
    return { gerado: false, motivo: 'falha_no_registro', erro: mensagem };
  }

  return {
    gerado: true,
    storagePath,
    mimeType: imagem.mimeType,
    provider: artefato.providerId,
    model: artefato.model,
  };
}

function motivoDoClaim(status: string | null, attempts: number | null): TrainingImagePipelineResult {
  if (status === 'processing' || status === 'pending') return { gerado: false, motivo: 'em_processamento' };
  if (status === 'succeeded') return { gerado: false, motivo: 'ja_processado' };
  if ((attempts ?? 0) >= TENTATIVAS_MAX_PIPELINE) return { gerado: false, motivo: 'limite_de_tentativas' };
  return { gerado: false, motivo: 'ja_processado' };
}
