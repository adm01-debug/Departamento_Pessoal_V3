export const BACKUP_TABLE_ROW_LIMIT = 10_000;

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
