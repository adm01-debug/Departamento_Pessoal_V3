/**
 * ============================================================================
 * NINE-BOX · MODO DE OPERAÇÃO (demonstração × real) — ATIVAÇÃO CONTROLADA.
 *
 * O design aprovado e os mocks são intencionais e permanecem intactos. Este
 * módulo apenas decide QUAL base alimenta a aba:
 *
 *   • `demonstracao` (PADRÃO): as listas fictícias de `nineBoxMock`/`desempenhoMock`
 *     continuam sendo usadas exatamente como hoje — nada muda na experiência.
 *   • `real`: somente registros persistidos e ELEGÍVEIS do Supabase, com
 *     `consolidarNineBox360` (metodologia aprovada) e as RPCs de finalização.
 *
 * ── POR QUE O PADRÃO É `false` ─────────────────────────────────────────────
 * A Fase E depende da migration `20261015090000_ninebox_finalizacao_e_potencial.sql`
 * aplicada (RPCs `finalizar_feedback`/`validar_potencial_avaliacao`, view de
 * versão). Enquanto ela não estiver aplicada e homologada, ligar o modo real
 * exibiria controles que NÃO persistem. Então:
 *   • o padrão é `demonstracao`;
 *   • qualquer tentativa de operar no modo real sem a flag ligada LANÇA ERRO —
 *     nunca simula sucesso de gravação.
 * ============================================================================
 */

/** Interruptor único do modo real. Mantenha `false` até a homologação. */
export const NINEBOX_MODO_REAL_ATIVO = false;

export type ModoNineBox = 'demonstracao' | 'real';

/** Modo em vigor (explícito, nunca inferido de dados misturados). */
export function modoNineBox(): ModoNineBox {
  return NINEBOX_MODO_REAL_ATIVO ? 'real' : 'demonstracao';
}

/** A aba está em modo real? */
export function modoRealAtivo(): boolean {
  return NINEBOX_MODO_REAL_ATIVO;
}

export class ModoRealIndisponivelError extends Error {
  constructor(operacao: string) {
    super(
      `"${operacao}" exige o modo real do Nine-Box, que está DESATIVADO. ` +
        'Ative somente depois de aplicar e homologar a migration de finalização ' +
        '(RPCs + view de versão). Nenhuma gravação foi simulada.'
    );
    this.name = 'ModoRealIndisponivelError';
  }
}

/**
 * Portão das operações que dependem do banco. Lança (não simula, não engole)
 * quando o modo real está desligado.
 */
export function exigirModoReal(operacao: string): void {
  if (!modoRealAtivo()) throw new ModoRealIndisponivelError(operacao);
}
