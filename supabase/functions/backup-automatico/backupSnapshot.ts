// E50-43: BACKUP_TABLE_ROW_LIMIT era o tamanho de uma única página buscada
// de uma vez — qualquer tabela acima disso fazia o backup inteiro falhar
// com 503, silenciosamente, sem paginar. Agora é só o teto de segurança
// (contra OOM na edge function); a busca real pagina por keyset em
// BACKUP_PAGE_SIZE até esgotar a tabela.
export const BACKUP_PAGE_SIZE = 1_000;
export const BACKUP_TABLE_ROW_LIMIT = 200_000;

export type BackupTableQueryResult = {
  data: unknown[] | null;
  count: number | null;
  error: { message: string } | null;
};

export type BackupSnapshotErrorCode = 'BACKUP_TABLE_QUERY_FAILED' | 'BACKUP_INCOMPLETE';

/**
 * Erros de snapshot não podem virar um backup aparentemente válido. O código
 * é seguro para expor ao caller; os detalhes do PostgREST ficam somente no
 * Sentry/auditoria da função.
 */
export class BackupSnapshotError extends Error {
  constructor(
    readonly code: BackupSnapshotErrorCode,
    readonly table: string,
  ) {
    super(code === 'BACKUP_INCOMPLETE'
      ? `A exportação de ${table} excede o limite de ${BACKUP_TABLE_ROW_LIMIT} registros`
      : `Não foi possível consultar ${table} para o backup`);
    this.name = 'BackupSnapshotError';
  }

  get httpStatus(): 502 | 503 {
    return this.code === 'BACKUP_INCOMPLETE' ? 503 : 502;
  }

  get publicMessage(): string {
    return this.code === 'BACKUP_INCOMPLETE'
      ? 'O backup não foi gerado porque a exportação não está completa. Use o fluxo assíncrono de backup.'
      : 'O backup não foi gerado porque uma tabela não pôde ser consultada.';
  }
}

/**
 * O PostgREST devolve a contagem total mesmo com limit(). Só aceitamos a
 * tabela quando cada registro contabilizado foi efetivamente incluído no
 * payload. Assim, erro, contagem ausente e truncamento falham fechados.
 */
export function requireCompleteBackupTable(
  table: string,
  result: BackupTableQueryResult,
): { data: unknown[]; count: number } {
  if (result.error) {
    throw new BackupSnapshotError('BACKUP_TABLE_QUERY_FAILED', table);
  }

  const data = result.data ?? [];
  if (!Number.isSafeInteger(result.count) || (result.count ?? -1) < 0 || result.count !== data.length) {
    throw new BackupSnapshotError('BACKUP_INCOMPLETE', table);
  }

  return { data, count: result.count };
}

/**
 * E50-43: pagina por keyset (cursor em `id`, cuja ordenação é estável mesmo
 * sendo uuid) até esgotar a tabela, em vez de tentar tudo numa única
 * chamada com limit(). `fetchPage` recebe o cursor da última página (null
 * na primeira) e deve devolver a página seguinte já ordenada por `id`.
 *
 * Fail-closed preservado: contagem ausente/negativa, página com linha sem
 * `id` utilizável como cursor, ou total acumulado acima do teto de
 * segurança (BACKUP_TABLE_ROW_LIMIT) — tudo aborta sem devolver snapshot
 * parcial, igual ao comportamento anterior, só que agora cobrindo tabelas
 * muito maiores antes de precisar abortar.
 */
export async function fetchAllRowsPaginated(
  table: string,
  fetchPage: (afterId: string | null) => Promise<BackupTableQueryResult>,
): Promise<{ data: unknown[]; count: number }> {
  const allData: Record<string, unknown>[] = [];
  let totalCount: number | null = null;
  let cursor: string | null = null;

  while (true) {
    const result = await fetchPage(cursor);
    if (result.error) {
      throw new BackupSnapshotError('BACKUP_TABLE_QUERY_FAILED', table);
    }
    if (totalCount === null) {
      if (!Number.isSafeInteger(result.count) || (result.count ?? -1) < 0) {
        throw new BackupSnapshotError('BACKUP_INCOMPLETE', table);
      }
      totalCount = result.count as number;
    }

    const page = (result.data ?? []) as Record<string, unknown>[];
    if (page.length === 0) break;
    allData.push(...page);
    if (allData.length > BACKUP_TABLE_ROW_LIMIT) {
      throw new BackupSnapshotError('BACKUP_INCOMPLETE', table);
    }

    const lastId = page[page.length - 1]?.id;
    if (page.length < BACKUP_PAGE_SIZE || typeof lastId !== 'string') break;
    cursor = lastId;
  }

  if (allData.length !== totalCount) {
    throw new BackupSnapshotError('BACKUP_INCOMPLETE', table);
  }

  return { data: allData, count: totalCount };
}
