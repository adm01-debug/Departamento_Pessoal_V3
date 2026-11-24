/**
 * Physical audit action written by current backup executions.
 *
 * `BACKUP_RUN` is retained only as a read-side compatibility value because
 * historical rows may predate the canonical `audit_log_acao_check` contract.
 */
export const BACKUP_AUDIT_READ_ACTIONS = ['BACKUP_CREATED', 'BACKUP_RUN'] as const;
