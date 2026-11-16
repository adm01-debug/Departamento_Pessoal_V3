/**
 * ============================================================================
 * SOLICITAÇÃO DE IMAGEM — derivada do CADASTRO, nunca escrita pelo usuário.
 *
 * O app não expõe campo de prompt, estilo, modelo ou resolução. Quem chama
 * entrega apenas os dados reais do registro; este módulo:
 *   1. sanea o texto (sem delimitadores de injeção, com limite de tamanho);
 *   2. deriva um briefing visual (`briefing.ts`) — com enriquecimento por tema
 *      e caminho genérico para QUALQUER assunto novo;
 *   3. calcula `contentHash` (detecta edição) e `operationId` (idempotência).
 *
 * PRIVACIDADE: o pedido carrega SOMENTE dados de catálogo. Nenhum nome de
 * colaborador, e-mail, CPF, matrícula, foto ou código de certificado é copiado
 * para cá — inclusive nas turmas, que herdam apenas a identidade do CURSO.
 * ============================================================================
 */
import { DESCRICAO_MAX, PROMPT_VERSION, montarBriefingVisual, sanearTexto } from './briefing';
import { sha256Hex } from './hash';
import type { TrainingContentType, TrainingImageRequest } from './types';

export {
  DESCRICAO_MAX,
  NOME_MAX,
  PROMPT_VERSION,
  montarBriefingVisual,
  paletaPorCategoria,
  sanearTexto,
} from './briefing';
export type { BriefingVisual, EntradaBriefing } from './briefing';

export interface EntradaSolicitacaoImagem {
  contentType: TrainingContentType;
  contentId: string;
  empresaId: string;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  modalidade?: string | null;
  cargaHoraria?: number | string | null;
  obrigatorio?: boolean | null;
  nivel?: string | null;
  cursosVinculados?: readonly string[];
  /** Curso de origem (turmas/certificados herdam a imagem do curso). */
  origemId?: string | null;
}

/**
 * Impressão digital do CONTEÚDO que influencia a imagem (SHA-256, 64 hex).
 * Editar nome/descrição/categoria/nível/cursos muda o hash e libera uma nova
 * geração; salvar o mesmo registro de novo NÃO muda nada (evita custo repetido).
 */
export function hashConteudo(entrada: EntradaSolicitacaoImagem): string {
  const base = [
    entrada.contentType,
    sanearTexto(entrada.nome),
    sanearTexto(entrada.descricao, DESCRICAO_MAX),
    sanearTexto(entrada.categoria, 80),
    sanearTexto(entrada.nivel, 40),
    (entrada.cursosVinculados ?? []).map((curso) => sanearTexto(curso, 80)).join(';'),
  ].join('|');
  return sha256Hex(base);
}

/**
 * Chave de idempotência estável (empresa + tipo + id + hash do conteúdo).
 * `ti_` + 32 primeiros hex do SHA-256 — curta para logs/headers, sem colisão
 * relevante para a mesma operação.
 */
export function montarOperationId(entrada: EntradaSolicitacaoImagem, contentHash = hashConteudo(entrada)): string {
  return `ti_${sha256Hex(`${entrada.empresaId}|${entrada.contentType}|${entrada.contentId}|${contentHash}`).slice(0, 32)}`;
}

/**
 * Monta o pedido completo a partir de um cadastro. Não valida tenant (isso é
 * responsabilidade do serviço/backend) e não acessa banco/rede.
 */
export function montarSolicitacaoImagem(entrada: EntradaSolicitacaoImagem): TrainingImageRequest {
  const briefing = montarBriefingVisual({
    tipo: entrada.contentType,
    nome: entrada.nome,
    descricao: entrada.descricao,
    categoria: entrada.categoria,
    nivel: entrada.nivel,
    cursosVinculados: entrada.cursosVinculados,
  });
  const contentHash = hashConteudo(entrada);
  const carga = Number(entrada.cargaHoraria);

  return {
    contentType: entrada.contentType,
    contentId: entrada.contentId,
    empresaId: entrada.empresaId,
    operationId: montarOperationId(entrada, contentHash),
    contentHash,
    promptVersion: PROMPT_VERSION,
    name: sanearTexto(entrada.nome),
    description: sanearTexto(entrada.descricao, DESCRICAO_MAX) || null,
    category: sanearTexto(entrada.categoria, 80) || null,
    modality: sanearTexto(entrada.modalidade, 40) || null,
    workloadHours: Number.isFinite(carga) && carga > 0 ? carga : null,
    level: sanearTexto(entrada.nivel, 40) || null,
    mandatory: entrada.obrigatorio ?? null,
    linkedCourseNames: (entrada.cursosVinculados ?? []).map((nome) => sanearTexto(nome, 80)).filter(Boolean),
    sourceContentId: entrada.origemId ?? null,
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
  };
}
