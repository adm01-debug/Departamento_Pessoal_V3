import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  BACKUP_TABLE_ROW_LIMIT,
  BackupSnapshotError,
  requireCompleteBackupTable,
} from './backupSnapshot.ts';

Deno.test('aceita somente uma tabela cuja contagem confere com os dados exportados', () => {
  const result = requireCompleteBackupTable('colaboradores', {
    data: [{ id: '1' }, { id: '2' }],
    count: 2,
    error: null,
  });

  assertEquals(result.count, 2);
  assertEquals(result.data, [{ id: '1' }, { id: '2' }]);
});

Deno.test('rejeita falha de consulta sem produzir snapshot parcial', () => {
  const error = assertThrows(
    () => requireCompleteBackupTable('colaboradores', {
      data: null,
      count: null,
      error: { message: 'permission denied' },
    }),
    BackupSnapshotError,
  );

  assertEquals(error.code, 'BACKUP_TABLE_QUERY_FAILED');
  assertEquals(error.httpStatus, 502);
});

Deno.test('rejeita truncamento pelo limite de exportação', () => {
  const error = assertThrows(
    () => requireCompleteBackupTable('colaboradores', {
      data: [{ id: '1' }],
      count: BACKUP_TABLE_ROW_LIMIT + 1,
      error: null,
    }),
    BackupSnapshotError,
  );

  assertEquals(error.code, 'BACKUP_INCOMPLETE');
  assertEquals(error.httpStatus, 503);
});
