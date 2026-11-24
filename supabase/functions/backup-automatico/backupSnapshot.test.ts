import { assertEquals, assertRejects, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  BACKUP_PAGE_SIZE,
  BACKUP_TABLE_ROW_LIMIT,
  BackupSnapshotError,
  fetchAllRowsPaginated,
  requireCompleteBackupTable,
} from './backupSnapshot.ts';
import { BACKUP_AUDIT_READ_ACTIONS } from './backupAudit.ts';

Deno.test('consulta a ação física atual e preserva leitura do histórico legado', () => {
  assertEquals(BACKUP_AUDIT_READ_ACTIONS, ['BACKUP_CREATED', 'BACKUP_RUN']);
});

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

// E50-43: paginação por keyset

Deno.test('fetchAllRowsPaginated acumula múltiplas páginas até esgotar a tabela', async () => {
  const rows = Array.from({ length: BACKUP_PAGE_SIZE + 5 }, (_, i) => ({ id: String(i + 1).padStart(6, '0') }));
  const pages = [rows.slice(0, BACKUP_PAGE_SIZE), rows.slice(BACKUP_PAGE_SIZE)];
  let call = 0;

  const result = await fetchAllRowsPaginated('colaboradores', async (afterId) => {
    const page = pages[call];
    call++;
    if (call === 1) assertEquals(afterId, null);
    else assertEquals(afterId, pages[0][pages[0].length - 1].id);
    return { data: page, count: call === 1 ? rows.length : null, error: null };
  });

  assertEquals(result.count, rows.length);
  assertEquals(result.data.length, rows.length);
  assertEquals(call, 2);
});

Deno.test('fetchAllRowsPaginated devolve tabela vazia sem chamar página extra', async () => {
  let calls = 0;
  const result = await fetchAllRowsPaginated('colaboradores', async () => {
    calls++;
    return { data: [], count: 0, error: null };
  });
  assertEquals(result.count, 0);
  assertEquals(result.data, []);
  assertEquals(calls, 1);
});

Deno.test('fetchAllRowsPaginated aborta se uma página falhar', async () => {
  await assertRejects(
    () => fetchAllRowsPaginated('colaboradores', async () => ({
      data: null,
      count: null,
      error: { message: 'permission denied' },
    })),
    BackupSnapshotError,
  );
});

Deno.test('fetchAllRowsPaginated aborta acima do teto de segurança em vez de crescer sem limite', async () => {
  await assertRejects(
    () => fetchAllRowsPaginated('colaboradores', async () => ({
      // cada página vem cheia — a função tem que abortar antes de tentar
      // acumular todo o "resto" de uma tabela maior que o teto de segurança.
      data: Array.from({ length: BACKUP_PAGE_SIZE }, (_, i) => ({ id: String(i) })),
      count: BACKUP_TABLE_ROW_LIMIT + 1,
      error: null,
    })),
    BackupSnapshotError,
  );
});
