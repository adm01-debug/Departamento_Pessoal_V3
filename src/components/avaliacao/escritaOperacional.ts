/**
 * ============================================================================
 * GUARDA DE ESCRITA OPERACIONAL (Gestão de Desempenho / Nine-Box).
 *
 * ── POR QUE ESTA CAMADA EXISTE ──────────────────────────────────────────────
 * A área pode estar EXIBINDO dados fictícios: `MOCK_NINEBOX_ATIVO` está ligado
 * e, em desenvolvimento com `VITE_DESEMPENHO_MOCK=true`, as listas de ciclos,
 * feedbacks, PDIs e competências vêm de `desempenhoMock`. Os identificadores
 * desses registros são reconhecíveis (`mock-empresa-1`, `mock-ciclo-3`, ...).
 *
 * Ligar/desligar a flag da MATRIZ não é proteção suficiente para os fluxos de
 * escrita: a matriz é só UMA das origens possíveis de id, e a gravação pode
 * partir de qualquer tela (formulário de feedback, ações de status, validação
 * de Potencial). Por isso a proteção fica no CAMINHO DA ESCRITA — este módulo é
 * usado por todas as RPCs de escrita do módulo (`avaliacaoService`).
 *
 * ── AS DUAS REGRAS ──────────────────────────────────────────────────────────
 *   1. DADO FICTÍCIO NUNCA GRAVA. Qualquer campo enviado com valor iniciado em
 *      `mock-` (empresa, ciclo, avaliado, avaliador, feedback) bloqueia a
 *      operação — antes de qualquer chamada de rede.
 *   2. DEMONSTRAÇÃO NÃO GRAVA. Com o mock do módulo ligado (dev + env var),
 *      nenhuma escrita real é disparada.
 *
 * ── O QUE ESTE MÓDULO NÃO FAZ ───────────────────────────────────────────────
 *   • não decide permissão (papel/empresa são validados no banco);
 *   • não simula sucesso nem engole erro: LANÇA, para a interface mostrar o
 *     motivo REAL do bloqueio (nada de "registrado!" sem gravação).
 * ============================================================================
 */

import { isDesempenhoMockEnabled } from '@/mocks/desempenhoMock';

/** Prefixo de TODO identificador fictício do módulo (`mock-empresa-1`, ...). */
export const PREFIXO_FICTICIO = 'mock-';

/** O valor é um identificador fictício? Vazio/`null` NUNCA é fictício. */
export function idFicticio(valor: unknown): boolean {
  const texto = String(valor ?? '').trim();
  return texto.startsWith(PREFIXO_FICTICIO);
}

/** Nomes dos campos que carregam identificador fictício (na ordem do objeto). */
export function camposFicticios(campos: Record<string, unknown>): string[] {
  return Object.entries(campos ?? {})
    .filter(([, valor]) => idFicticio(valor))
    .map(([nome]) => nome);
}

/** O modo demonstração do módulo está ligado (dev + `VITE_DESEMPENHO_MOCK`)? */
export function demonstracaoEmUso(): boolean {
  return isDesempenhoMockEnabled();
}

export type MotivoBloqueioEscrita = 'dado_ficticio' | 'demonstracao';

/** Bloqueio de escrita operacional. NUNCA é sucesso: a operação não aconteceu. */
export class EscritaBloqueadaError extends Error {
  readonly motivo: MotivoBloqueioEscrita;
  readonly campos: string[];

  constructor(operacao: string, motivo: MotivoBloqueioEscrita, campos: string[] = []) {
    super(
      motivo === 'demonstracao'
        ? `"${operacao}" foi BLOQUEADA: a área está em modo demonstração (dados fictícios) e nada foi gravado no banco.`
        : `"${operacao}" foi BLOQUEADA: identificador fictício de demonstração em ${campos.join(', ')}. Nenhuma gravação foi feita.`
    );
    this.name = 'EscritaBloqueadaError';
    this.motivo = motivo;
    this.campos = campos;
  }
}

/**
 * Portão obrigatório de TODA escrita operacional do módulo.
 * Chamar ANTES de montar qualquer chamada ao Supabase.
 */
export function exigirEscritaOperacional(operacao: string, campos: Record<string, unknown>): void {
  if (demonstracaoEmUso()) throw new EscritaBloqueadaError(operacao, 'demonstracao');

  const ficticios = camposFicticios(campos);
  if (ficticios.length > 0) throw new EscritaBloqueadaError(operacao, 'dado_ficticio', ficticios);
}
