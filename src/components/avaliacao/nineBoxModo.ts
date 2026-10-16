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

/**
 * Interruptor único do modo real — CONTROLADO POR AMBIENTE (local-only).
 *
 * Liga SOMENTE quando as três condições valem:
 *   1. `import.meta.env.DEV`             — build de desenvolvimento;
 *   2. `import.meta.env.MODE !== 'test'` — nunca nos testes;
 *   3. `VITE_NINEBOX_MODO_REAL === 'true'` no `.env.local` (arquivo git-ignored).
 *
 * Em PRODUÇÃO a variável não existe, então o valor é `false` para todos os
 * usuários — o comportamento de hoje é preservado e ninguém liga o modo real
 * "sem querer" por variável de ambiente. O modo demonstração e os mocks
 * continuam intactos (nada é removido; a flag apenas escolhe a origem dos dados).
 * Para ligar no ambiente local de homologação: `VITE_NINEBOX_MODO_REAL=true`
 * no `.env.local` e reiniciar o `vite dev`.
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
