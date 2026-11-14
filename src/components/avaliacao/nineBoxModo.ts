/**
 * ============================================================================
 * NINE-BOX · MODO DE OPERAÇÃO (demonstração × real) — ATIVAÇÃO CONTROLADA.
 *
 * O design aprovado e os mocks são intencionais e permanecem intactos. Este
 * módulo decide se as FIXTURES de demonstração são exibidas:
 *
 *   • `demonstracao` (PADRÃO no dev com `VITE_DESEMPENHO_MOCK=true`): a vitrine
 *     aprovada continua visível e pode conviver com registros REAIS na mesma
 *     tela (a escolha do serviço é POR REGISTRO: UUID → RPC; mock → local).
 *   • `real`: as fixtures são desligadas; a aba usa somente registros do banco.
 *
 * ── O QUE A FLAG **NÃO** FAZ ───────────────────────────────────────────────
 * Ela não decide mais a persistência de um UUID: aprovação/validação de um
 * registro REAL sempre passam pelas RPCs, mesmo com mocks exibidos ao lado.
 * `exigirModoReal()` continua disponível como portão explícito para operações
 * que, no futuro, só façam sentido com a vitrine desligada — mas não é chamado
 * pelas leituras/escritas reais do fluxo.
 * ============================================================================
 */

/**
 * Interruptor do modo real (desliga as fixtures) — CONTROLADO POR AMBIENTE.
 *
 * `true` somente quando:
 *   1. `import.meta.env.DEV`             — build de desenvolvimento;
 *   2. `import.meta.env.MODE !== 'test'` — nunca nos testes;
 *   3. `VITE_NINEBOX_MODO_REAL === 'true'` no `.env.local` (git-ignored).
 *
 * Em produção o valor é `false` (as fixtures também não existem), mas os
 * registros reais continuam sendo gravados pelas RPCs — a flag não é um gate de
 * escrita real. Para a vitrine local: `VITE_NINEBOX_MODO_REAL=false`.
 */
export const NINEBOX_MODO_REAL_ATIVO =
  import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_NINEBOX_MODO_REAL === 'true';

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
