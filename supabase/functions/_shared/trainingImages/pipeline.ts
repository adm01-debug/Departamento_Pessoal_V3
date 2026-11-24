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
import { DESCRICAO_MAX, montarBriefingVisual, sanearTexto } from './briefing.ts';
import { sha256Hex } from './hash.ts';
import { mensagemSegura, validarImagemGerada } from './imageValidation.ts';
import {
  TRAINING_CONTENT_TYPES,
  TrainingImageProviderError,
  type ClaimTrainingImageResult,
  type ConteudoTreinamento,
  type TrainingContentType,
  type TrainingImagePipelineResult,
  type TrainingImageProvider,
} from './types.ts';

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
    /** Rastreabilidade da requisição paga (X-Client-Request-Id / operationId). */
    operationId: string;
  }) => Promise<void>;
  atualizarFalha: (dados: {
    id: string;
    erro: string;
    permanente: boolean;
    operationId: string;
  }) => Promise<void>;
  /**
   * Persiste o `operation_id` ANTES da chamada paga. Se o processo morrer no
   * meio, a linha já contém o identificador necessário para a reconciliação.
   */
  registrarOperacao?: (dados: { id: string; operationId: string }) => Promise<void>;
}

export const TENTATIVAS_MAX_PIPELINE = 3;

/**
 * Erro cujo RESULTADO no provedor é DESCONHECIDO: a requisição pode ter sido
 * aceita e cobrada, mesmo sem resposta. `operationId`/`X-Client-Request-Id`
 * ajudam no suporte, mas não impedem cobrança duplicada — só a não-repetição
 * automática impede.
 */
export function resultadoDesconhecido(erro: unknown): boolean {
  if (!(erro instanceof TrainingImageProviderError)) return false;
  if (erro.code === 'timeout' || erro.code === 'rede' || erro.code === 'download_falhou') return true;
  return typeof erro.status === 'number' && erro.status >= 500;
}

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
    await deps.atualizarFalha({
      id: claim.id,
      erro: 'provedor_desativado',
      permanente: true,
      operationId,
    });
    return { gerado: false, motivo: 'provedor_desativado' };
  }

  // Rastreabilidade ANTES do gasto: falha aqui não impede a geração.
  if (deps.registrarOperacao) {
    try {
      await deps.registrarOperacao({ id: claim.id, operationId });
    } catch {
      // best-effort: o operationId também é gravado no sucesso/falha
    }
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
    /**
     * POLÍTICA CONSERVADORA DE COBRANÇA (Fase 3A.1)
     *
     * `X-Client-Request-Id`/`operationId` servem para RASTREABILIDADE — não são
     * garantia de que o provedor não cobrou. Quando a resposta se perde
     * (timeout, falha de rede, 5xx, download da imagem), o resultado é
     * DESCONHECIDO: a geração anterior pode ter sido concluída e cobrada.
     *
     * Nesse caso marcamos a linha como falha PERMANENTE (`attempts` esgotado),
     * registrando o estado de incerteza em `last_error`. Nenhuma nova chamada
     * paga é disparada automaticamente; a reconciliação é manual.
     */
    const incerto = resultadoDesconhecido(erro);
    const permanente = erro instanceof TrainingImageProviderError ? erro.retryable === false : false;
    const mensagem = mensagemSegura(erro);
    await deps.atualizarFalha({
      id: claim.id,
      erro: incerto ? `resultado_desconhecido: ${mensagem}` : mensagem,
      permanente: incerto || permanente,
      operationId,
    });
    return incerto
      ? { gerado: false, motivo: 'resultado_desconhecido', erro: mensagem }
      : { gerado: false, motivo: 'falha_no_provedor', erro: mensagem };
  }

  let imagem;
  try {
    imagem = validarImagemGerada(artefato.bytes);
  } catch (erro) {
    const mensagem = mensagemSegura(erro);
    await deps.atualizarFalha({ id: claim.id, erro: mensagem, permanente: true, operationId });
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
    // A imagem JÁ foi gerada (e cobrada). Repetir geraria NOVA cobrança, então
    // a falha de upload é tratada como definitiva para novas tentativas
    // automáticas; o registro permite reconciliação/manual.
    const mensagem = mensagemSegura(erro);
    await deps.atualizarFalha({ id: claim.id, erro: mensagem, permanente: true, operationId });
    return { gerado: false, motivo: 'falha_no_upload', erro: mensagem };
  }

  try {
    await deps.atualizarSucesso({
      id: claim.id,
      storagePath,
      provider: artefato.providerId,
      model: artefato.model,
      promptVersion: artefato.promptVersion,
      operationId,
    });
  } catch (erro) {
    // Imagem JÁ gerada e enviada ao Storage; repetir custaria outra geração.
    const mensagem = mensagemSegura(erro);
    await deps.atualizarFalha({ id: claim.id, erro: mensagem, permanente: true, operationId });
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
