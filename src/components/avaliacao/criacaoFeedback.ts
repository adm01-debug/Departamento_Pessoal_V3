/**
 * ============================================================================
 * CRIAÇÃO DE FEEDBACK — PONTE ENTRE O FORMULÁRIO EXISTENTE E A RPC AUDITADA.
 *
 * O `NovoFeedbackDialog` NÃO muda: ele continua validando os mesmos campos e
 * entregando o MESMO objeto para a página. O que muda é o DESTINO da gravação
 * quando o modo real está ligado — `criar_feedback_seguro`, que grava o
 * feedback e a auditoria na mesma transação, com o servidor decidindo papel,
 * empresa, categoria e escala.
 *
 * ── IDEMPOTÊNCIA (regra do plano) ───────────────────────────────────────────
 * A chave (`idOperacao`) nasce UMA vez por TENTATIVA e é reaproveitada em todo
 * reenvio da MESMA tentativa (duplo clique, falha de rede, retry manual). Só
 * uma operação NOVA — quando o conteúdo enviado muda ou quando a criação já foi
 * confirmada pelo servidor (`confirmar()`) — recebe chave nova. Isso é o oposto
 * de "hash permanente do conteúdo": duas avaliações legítimas com as MESMAS
 * notas continuam sendo duas operações distintas.
 *
 * Este módulo é PURO (sem React, sem Supabase, sem I/O), por isso é testável:
 * ver `src/components/__tests__/CriacaoFeedbackIntegracao.test.ts`.
 * ============================================================================
 */

import { notaNaEscala } from './nineBoxConsolidacao';

/* ─── Tipos do formulário (os MESMOS nomes de coluna de `feedbacks_360`) ───── */

export const TIPOS_FEEDBACK = ['gestor', 'par', 'auto', 'subordinado'] as const;
export type TipoFeedback = (typeof TIPOS_FEEDBACK)[number];

export interface EntradaFeedbackForm {
  avaliado_id?: unknown;
  avaliador_id?: unknown;
  ciclo_id?: unknown;
  tipo?: unknown;
  nota_geral?: unknown;
  potencial?: unknown;
  pontos_fortes?: unknown;
  pontos_melhoria?: unknown;
  comentarios?: unknown;
}

/** Payload exato da RPC `criar_feedback_seguro` (camelCase do serviço). */
export interface ParametrosCriacaoSegura {
  empresaId: string;
  avaliadoId: string;
  cicloId: string;
  tipo: TipoFeedback;
  notaGeral: number;
  potencial: number | null;
  avaliadorId: string | null;
  pontosFortes: string | null;
  pontosMelhoria: string | null;
  comentarios: string | null;
  idOperacao: string;
}

/* ─── Normalizações ───────────────────────────────────────────────────────── */

/** Texto aparado ou `null` (nunca `undefined`, nunca string vazia). */
export function textoOuNulo(valor: unknown): string | null {
  const texto = String(valor ?? '').trim();
  return texto ? texto : null;
}

/**
 * Assinatura estável do conteúdo enviado: identifica a TENTATIVA. Campos são
 * lidos em ordem fixa e normalizados, então a ordem das chaves do objeto
 * recebido não afeta o resultado.
 */
export function assinaturaFeedback(entrada: EntradaFeedbackForm): string {
  const tipo = textoOuNulo(entrada?.tipo) ?? '';
  return JSON.stringify([
    textoOuNulo(entrada?.avaliado_id) ?? '',
    textoOuNulo(entrada?.avaliador_id) ?? '',
    textoOuNulo(entrada?.ciclo_id) ?? '',
    tipo.toLowerCase(),
    notaNaEscala(entrada?.nota_geral) ?? '',
    notaNaEscala(entrada?.potencial) ?? '',
    textoOuNulo(entrada?.pontos_fortes) ?? '',
    textoOuNulo(entrada?.pontos_melhoria) ?? '',
    textoOuNulo(entrada?.comentarios) ?? '',
  ]);
}

/* ─── Chave de idempotência por operação ──────────────────────────────────── */

/** Gera um identificador de operação único (UUID quando disponível). */
export function gerarIdOperacao(): string {
  const cripto = (globalThis as { crypto?: Crypto }).crypto;
  if (cripto && typeof cripto.randomUUID === 'function') return cripto.randomUUID();
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface ChaveIdempotente {
  /** Chave da operação atual (nova só se a assinatura mudou ou já foi confirmada). */
  para(assinatura: string): string;
  /** Confirma a operação: a PRÓXIMA criação — mesmo de conteúdo igual — é nova. */
  confirmar(): void;
  /** Chave em vigor, sem criar nenhuma (`null` antes da primeira chamada). */
  atual(): string | null;
  /** Quantos pedidos foram feitos para a operação atual (diagnóstico/teste). */
  tentativas(): number;
}

/**
 * Fábrica da chave de idempotência. `gerar` é injetável para teste — em
 * produção usa `gerarIdOperacao` (UUID).
 */
export function criarChaveIdempotente(gerar: () => string = gerarIdOperacao): ChaveIdempotente {
  let assinaturaAtual: string | null = null;
  let chave: string | null = null;
  let pedidos = 0;

  return {
    para(assinatura: string): string {
      if (chave === null || assinaturaAtual !== assinatura) {
        assinaturaAtual = assinatura;
        chave = gerar();
        pedidos = 0;
      }
      pedidos += 1;
      return chave;
    },
    confirmar(): void {
      assinaturaAtual = null;
      chave = null;
      pedidos = 0;
    },
    atual: () => chave,
    tentativas: () => pedidos,
  };
}

/* ─── Validação de payload (espelho leve do formulário + da RPC) ───────────── */

export interface ResultadoValidacaoEntrada {
  valida: boolean;
  /** Campos ausentes, em linguagem de interface. */
  faltando: string[];
  descricao: string;
}

/**
 * Confere o MÍNIMO que a RPC exige. Não substitui a validação do formulário
 * (que permanece intacta) nem a do servidor — serve para não despachar uma
 * chamada que sabe-se de antemão incompleta.
 */
export function validarEntradaFeedback(entrada: EntradaFeedbackForm): ResultadoValidacaoEntrada {
  const faltando: string[] = [];
  if (!textoOuNulo(entrada?.avaliado_id)) faltando.push('colaborador avaliado');
  if (!textoOuNulo(entrada?.ciclo_id)) faltando.push('ciclo de avaliação');
  const tipo = (textoOuNulo(entrada?.tipo) ?? '').toLowerCase();
  if (!(TIPOS_FEEDBACK as readonly string[]).includes(tipo)) faltando.push('tipo do feedback');
  if (notaNaEscala(entrada?.nota_geral) === null) faltando.push('nota de desempenho (escala de 0,5 a 5)');

  return faltando.length === 0
    ? { valida: true, faltando, descricao: 'Dados completos para a criação auditada.' }
    : { valida: false, faltando, descricao: `Informe: ${faltando.join(', ')}.` };
}

/* ─── Payload da RPC ──────────────────────────────────────────────────────── */

/**
 * Converte a entrada do formulário no payload da RPC, preservando TODOS os
 * campos (textos vazios viram `null`; o Potencial fora da escala vira `null`).
 * Devolve `null` quando faltam dados obrigatórios ou contexto de tenant.
 */
export function payloadCriacaoSegura(
  entrada: EntradaFeedbackForm,
  contexto: { empresaId?: unknown; idOperacao?: unknown }
): ParametrosCriacaoSegura | null {
  const empresaId = textoOuNulo(contexto?.empresaId);
  const idOperacao = textoOuNulo(contexto?.idOperacao);
  if (!empresaId || !idOperacao) return null;
  if (!validarEntradaFeedback(entrada).valida) return null;

  return {
    empresaId,
    avaliadoId: textoOuNulo(entrada?.avaliado_id) as string,
    cicloId: textoOuNulo(entrada?.ciclo_id) as string,
    tipo: (textoOuNulo(entrada?.tipo) ?? '').toLowerCase() as TipoFeedback,
    notaGeral: notaNaEscala(entrada?.nota_geral) as number,
    potencial: notaNaEscala(entrada?.potencial),
    avaliadorId: textoOuNulo(entrada?.avaliador_id),
    pontosFortes: textoOuNulo(entrada?.pontos_fortes),
    pontosMelhoria: textoOuNulo(entrada?.pontos_melhoria),
    comentarios: textoOuNulo(entrada?.comentarios),
    idOperacao,
  };
}

/**
 * Campos que a guarda de escrita inspeciona (empresa + referências do registro).
 * Serve para barrar id fictício ANTES de qualquer chamada de rede.
 */
export function camposParaGuarda(
  entrada: EntradaFeedbackForm,
  empresaId?: unknown,
  idOperacao?: unknown
): Record<string, unknown> {
  return {
    empresa_id: textoOuNulo(empresaId),
    avaliado_id: textoOuNulo(entrada?.avaliado_id),
    avaliador_id: textoOuNulo(entrada?.avaliador_id),
    ciclo_id: textoOuNulo(entrada?.ciclo_id),
    id_operacao: textoOuNulo(idOperacao),
  };
}
