/**
 * ============================================================================
 * SERVIÇO DE IMAGENS — leitura, herança e solicitação (desligada nesta fase).
 *
 * TRÊS RESPONSABILIDADES, UM MÓDULO:
 *   1. `carregarImagensDaEmpresa` — LER as capas já existentes (uma consulta por
 *      empresa, gated pela flag `VITE_TRAINING_IMAGES`; sem flag, zero rede).
 *   2. `resolverImagemDoMapa` — HERANÇA: turma/certificado usam a imagem do
 *      CURSO quando não têm capa própria (nunca geram imagem por turma).
 *   3. `solicitarGeracaoImagem` — PONTO DE INTEGRAÇÃO. Com a integração
 *      desativada (estado atual) devolve `motivo: 'integracao_desativada'` sem
 *      tocar em rede, Storage, banco ou provedor.
 *
 * CONTROLE DE CUSTO (preparado para a próxima etapa)
 *   • nada é gerado ao abrir a página, em render ou em refetch: geração só
 *     acontece por chamada explícita do backend;
 *   • duas solicitações simultâneas do mesmo conteúdo compartilham a MESMA
 *     promessa (in-flight map) — o provedor é chamado uma vez;
 *   • limite de tentativas por conteúdo impede repetição ilimitada em erro;
 *   • uma capa por conteúdo (mesmo caminho, `upsert`) e turmas herdando o curso
 *     evitam gerar N imagens para o mesmo material.
 * ============================================================================
 */
import { supabase } from '@/integrations/supabase/client';
import { imagensDeTreinamentoHabilitadas } from './config';
import { chaveConteudo, validarCaminhoDaEmpresa } from './paths';
import { TrainingImageProviderError, obterTrainingImageProvider } from './provider';
import { montarSolicitacaoImagem, type EntradaSolicitacaoImagem } from './request';
import { assinarCaminhosDaEmpresa } from './storage';
import type {
  TrainingContentType,
  TrainingImageMap,
  TrainingImageProvider,
  TrainingImageRecord,
  TrainingImageRequestResult,
} from './types';
import { TRAINING_CONTENT_TYPES } from './types';

/** Teto de tentativas por conteúdo (proteção de custo). Alinhado ao SQL. */
export const TENTATIVAS_MAX = 3;

/** Limite de chaves no controle em memória (evita crescimento indefinido). */
const CONTROLE_MAX = 500;

/** Mapa imutável vazio — evita recriar referência em cada render. */
export const MAPA_IMAGENS_VAZIO: TrainingImageMap = new Map<string, string>();

/** Promessas em andamento: `empresa|tipo|id` → geração em curso. */
const emAndamento = new Map<string, Promise<TrainingImageRequestResult>>();
/** Tentativas já consumidas por conteúdo (memória do processo). */
const tentativas = new Map<string, number>();

/**
 * Mensagem segura para diagnóstico: remove chaves, tokens e URLs da resposta do
 * provedor. Nada de credencial em log/banco/UI.
 */
export function mensagemSeguraDoErro(erro: unknown): string {
  const bruta = erro instanceof Error ? erro.message : String(erro ?? '');
  return bruta
    .replace(/sk-[A-Za-z0-9-_]{6,}/g, '[redigido]')
    .replace(/bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redigido]')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

/** Garante que o controle em memória não cresça sem limite. */
function podarControle(): void {
  if (emAndamento.size > CONTROLE_MAX) emAndamento.clear();
  if (tentativas.size > CONTROLE_MAX) tentativas.clear();
}

/** Chave de controle (inclui o tenant para nunca compartilhar entre empresas). */
function chaveControle(solicitacao: EntradaSolicitacaoImagem): string {
  return `${solicitacao.empresaId}|${solicitacao.contentType}|${solicitacao.contentId}`;
}

/** Reset usado pelos testes (não exposto na UI). */
export function limparControleDeGeracao(): void {
  emAndamento.clear();
  tentativas.clear();
}

/**
 * Imagem de um conteúdo, considerando herança:
 *   turma/certificado → capa do próprio registro → capa do CURSO de origem.
 * A ordem importa: uma capa específica sempre ganha da herdada.
 */
export function resolverImagemDoMapa(
  mapa: TrainingImageMap,
  contentType: TrainingContentType,
  contentId: string | null | undefined,
  origemId?: string | null
): string | null {
  if (contentId) {
    const propria = mapa.get(chaveConteudo(contentType, contentId));
    if (propria) return propria;
  }
  if (origemId && (contentType === 'training_session' || contentType === 'certificate')) {
    const herdada = mapa.get(chaveConteudo('course', origemId));
    if (herdada) return herdada;
  }
  return null;
}

/** Linhas cruas da tabela (tipagem manual: a migration ainda não está no types.ts). */
type LinhaImagem = Pick<
  TrainingImageRecord,
  'content_type' | 'content_id' | 'source_content_id' | 'storage_path' | 'status'
>;

/**
 * Carrega as capas concluídas da empresa e devolve `Map<'tipo:id', urlAssinada>`.
 *
 * FALHA FECHADA E SILENCIOSA: sem flag, sem empresa, com tabela ausente, RLS
 * negando ou URL não assinável, o resultado é um mapa vazio — os cards seguem
 * com o fallback visual, sem erro de console e sem loading infinito.
 */
export async function carregarImagensDaEmpresa(empresaId: string | null | undefined): Promise<TrainingImageMap> {
  if (!empresaId || !imagensDeTreinamentoHabilitadas()) return MAPA_IMAGENS_VAZIO;

  try {
    const { data, error } = await (supabase as any)
      .from('training_images')
      .select('content_type, content_id, source_content_id, storage_path, status')
      .eq('empresa_id', empresaId)
      .eq('status', 'succeeded');
    if (error) return MAPA_IMAGENS_VAZIO;

    const linhas = ((data ?? []) as LinhaImagem[]).filter(
      (linha) => linha?.storage_path && validarCaminhoDaEmpresa(linha.storage_path, empresaId)
    );
    if (linhas.length === 0) return MAPA_IMAGENS_VAZIO;

    const urls = await assinarCaminhosDaEmpresa(
      linhas.map((linha) => linha.storage_path),
      empresaId
    );

    const mapa = new Map<string, string>();
    for (const linha of linhas) {
      const url = urls.get(linha.storage_path);
      if (!url) continue;
      mapa.set(chaveConteudo(linha.content_type, String(linha.content_id)), url);
      // Turmas e certificados herdam a capa do curso de origem.
      if (linha.source_content_id) {
        mapa.set(chaveConteudo('course', String(linha.source_content_id)), url);
      }
    }
    return mapa.size > 0 ? mapa : MAPA_IMAGENS_VAZIO;
  } catch {
    return MAPA_IMAGENS_VAZIO;
  }
}

/**
 * Solicita a geração de uma capa. PONTO DE INTEGRAÇÃO — desligado nesta fase.
 *
 * Nunca lança por integração desativada e nunca cria trabalho pendente: a
 * resposta é imediata e explícita. Nenhum `fetch` é executado.
 */
export async function solicitarGeracaoImagem(
  entrada: EntradaSolicitacaoImagem,
  opcoes: { provider?: TrainingImageProvider } = {}
): Promise<TrainingImageRequestResult> {
  if (!entrada.empresaId || !entrada.contentId) {
    return { aceito: false, motivo: 'identificadores_invalidos' };
  }
  if (!TRAINING_CONTENT_TYPES.includes(entrada.contentType)) {
    return { aceito: false, motivo: 'tipo_de_conteudo_invalido' };
  }

  const provider = opcoes.provider ?? obterTrainingImageProvider();

  // Estado desta fase: desativado por definição.
  if (!provider.configured) {
    return { aceito: false, motivo: 'integracao_desativada' };
  }

  podarControle();
  const controle = chaveControle(entrada);
  const jaEmAndamento = emAndamento.get(controle);
  if (jaEmAndamento) return jaEmAndamento;

  if ((tentativas.get(controle) ?? 0) >= TENTATIVAS_MAX) {
    return { aceito: false, motivo: 'limite_de_tentativas' };
  }

  const execucao = (async (): Promise<TrainingImageRequestResult> => {
    try {
      const imagem = await provider.generate(montarSolicitacaoImagem(entrada));
      // Defesa em profundidade: o adaptador não pode devolver caminho de outra empresa.
      if (!validarCaminhoDaEmpresa(imagem.storagePath, entrada.empresaId)) {
        tentativas.set(controle, TENTATIVAS_MAX);
        return { aceito: false, motivo: 'falha_no_provedor', erro: 'caminho_fora_do_tenant', permanente: true };
      }
      tentativas.delete(controle);
      return { aceito: true, imagem };
    } catch (erro) {
      /**
       * Erros PERMANENTES (credencial inválida, moderação, modelo inexistente)
       * esgotam as tentativas de uma vez: repetir só geraria custo. Erros
       * transitórios (timeout, 429, 5xx) somam uma tentativa.
       */
      const permanente = erro instanceof TrainingImageProviderError && erro.retryable === false;
      tentativas.set(controle, permanente ? TENTATIVAS_MAX : (tentativas.get(controle) ?? 0) + 1);
      return {
        aceito: false,
        motivo: 'falha_no_provedor',
        erro: mensagemSeguraDoErro(erro),
        ...(permanente ? { permanente: true } : {}),
      };
    } finally {
      emAndamento.delete(controle);
    }
  })();

  emAndamento.set(controle, execucao);
  return execucao;
}
