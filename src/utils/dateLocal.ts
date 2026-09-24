/**
 * Utilitários de data em fuso local (America/Sao_Paulo por padrão do runtime).
 *
 * PROBLEMA que este módulo resolve:
 *   `new Date().toISOString().split('T')[0]` retorna a data em UTC. Um usuário
 *   em UTC-3 registrando algo às 22h de 12/07 grava `2026-07-13` no banco —
 *   causando off-by-one em relatórios, filtros por competência, e datas de
 *   vigência de benefícios. O bug é silencioso (nenhum erro é lançado) e só
 *   aparece em uso real fora do horário comercial UTC.
 *
 * REGRA:
 *   - Para colunas DATE (sem hora) que representam "hoje para o usuário",
 *     use `todayLocalISO()` ou `formatDateLocalISO(date)`.
 *   - Para colunas TIMESTAMPTZ, continue usando `new Date().toISOString()` —
 *     Postgres armazena com fuso e a conversão é feita na renderização.
 */

/**
 * Formata uma data como `YYYY-MM-DD` no fuso local do navegador,
 * evitando o shift de UTC introduzido por `toISOString`.
 *
 * Determinístico e sem dependências — usa apenas os getters locais nativos.
 */
export function formatDateLocalISO(date: Date = new Date()): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    // Contrato defensivo: entrada inválida devolve string vazia em vez de
    // "NaN-NaN-NaN" que passaria pela validação de tipo mas quebraria o banco.
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Atalho para o caso mais comum: "hoje" no fuso do usuário. */
export function todayLocalISO(): string {
  return formatDateLocalISO(new Date());
}

/**
 * Inverso de `formatDateLocalISO`: lê `YYYY-MM-DD` como meia-noite no fuso
 * local, em vez de `new Date('YYYY-MM-DD')` (que o motor JS interpreta como
 * UTC e pode exibir o dia anterior em fusos negativos, como UTC-3). Usado
 * pelo `DatePicker` para reconstituir o `Date` que o calendário exibe a
 * partir do valor `YYYY-MM-DD` guardado no formulário/banco.
 */
export function parseDateLocalISO(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/**
 * Soma dias a uma data preservando o fuso local (ao contrário de operações
 * baseadas em UTC que podem cruzar meia-noite de forma inesperada).
 */
export function addDaysLocal(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Formata competência (`YYYY-MM`) no fuso local. Evita o mesmo off-by-one:
 * às 21h30 de 31/07 em UTC-3, `toISOString().slice(0,7)` retorna `2026-08`
 * (mês errado) — quebra filtros de folha, holerite e provisões.
 */
export function formatCompetenciaLocal(date: Date = new Date()): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Atalho: competência atual (`YYYY-MM`) no fuso do usuário. */
export function currentCompetenciaLocal(): string {
  return formatCompetenciaLocal(new Date());
}

