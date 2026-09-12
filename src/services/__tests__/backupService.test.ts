import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deepChain } from '@/test/deepChain';

const EMPRESA_ID = 'test-empresa-id';
import { exportarBackupCSV, exportarBackupJSON, downloadBlob } from '../backupService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));
vi.mock('@/utils/dateLocal', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/dateLocal')>()),
  formatDateLocalISO: () => '2026-07-24',
}));

function setupSelectLimit(
  data: Record<string, unknown>[] | null,
  error: { message: string } | null = null,
  count = data?.length ?? 0
) {
  const limitFn = vi.fn().mockResolvedValue({ data, error, count });
  const selectFn = vi.fn().mockReturnValue({ limit: limitFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { limitFn, selectFn };
}

// ─── exportarBackupCSV ────────────────────────────────────────────────────────

describe('exportarBackupCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns blob, fileName and stats when data is present', async () => {
    setupSelectLimit([
      { id: '1', nome: 'Alice' },
      { id: '2', nome: 'Bob' },
    ]);
    const result = await exportarBackupCSV(EMPRESA_ID, ['colaboradores']);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.fileName).toBeTruthy();
    expect(result.stats).toBeDefined();
  });

  it('fileName includes date from formatDateLocalISO', async () => {
    setupSelectLimit([]);
    const { fileName } = await exportarBackupCSV(EMPRESA_ID, ['colaboradores']);
    expect(fileName).toContain('2026-07-24');
  });

  it('stats.tabelas equals the number of tables passed', async () => {
    setupSelectLimit([]);
    const { stats } = await exportarBackupCSV(EMPRESA_ID, ['colaboradores', 'departamentos']);
    expect(stats.tabelas).toBe(2);
  });

  it('stats.registros counts total records across all tables', async () => {
    setupSelectLimit([{ id: '1' }, { id: '2' }, { id: '3' }]);
    const { stats } = await exportarBackupCSV(EMPRESA_ID, ['colaboradores']);
    expect(stats.registros).toBe(3);
  });

  it('CSV blob content type is text/csv;charset=utf-8;', async () => {
    setupSelectLimit([]);
    const { blob } = await exportarBackupCSV(EMPRESA_ID, ['colaboradores']);
    expect(blob.type).toBe('text/csv;charset=utf-8;');
  });

  it('falha em vez de produzir um CSV parcial quando uma tabela não pode ser lida', async () => {
    setupSelectLimit(null, { message: 'DB error' });
    await expect(exportarBackupCSV(EMPRESA_ID, ['colaboradores', 'departamentos'])).rejects.toThrow(
      'Erro ao exportar colaboradores: DB error'
    );
  });

  it('falha quando a consulta foi truncada pelo limite de segurança', async () => {
    setupSelectLimit([{ id: '1' }], null, 10_001);
    await expect(exportarBackupCSV(EMPRESA_ID, ['colaboradores'])).rejects.toThrow(
      'Exportação incompleta de colaboradores'
    );
  });

  it('rejeita tabela fora da allowlist antes de consultar o backend', async () => {
    await expect(exportarBackupCSV(EMPRESA_ID, ['auth.users'])).rejects.toThrow(
      'Tabela não permitida para exportação: auth.users'
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ─── exportarBackupJSON ───────────────────────────────────────────────────────

describe('exportarBackupJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns blob with correct JSON content type', async () => {
    setupSelectLimit([]);
    const { blob } = await exportarBackupJSON(EMPRESA_ID, ['colaboradores']);
    expect(blob.type).toBe('application/json;charset=utf-8;');
  });

  it('blob contains dados keys for each table', async () => {
    setupSelectLimit([{ id: '1' }]);
    const { blob } = await exportarBackupJSON(EMPRESA_ID, ['colaboradores']);
    const text = await blob.text();
    const json = JSON.parse(text);
    expect(json.dados).toHaveProperty('colaboradores');
  });

  it('stats.tabelas matches table count', async () => {
    setupSelectLimit([]);
    const { stats } = await exportarBackupJSON(EMPRESA_ID, ['colaboradores', 'departamentos']);
    expect(stats.tabelas).toBe(2);
  });

  it('falha em vez de produzir JSON parcial quando uma tabela falha', async () => {
    setupSelectLimit(null, { message: 'DB error' });
    await expect(exportarBackupJSON(EMPRESA_ID, ['colaboradores'])).rejects.toThrow(
      'Erro ao exportar colaboradores: DB error'
    );
  });
});

// ─── downloadBlob ─────────────────────────────────────────────────────────────

describe('downloadBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers anchor click and revokes URL', () => {
    const mockClick = vi.fn();
    const mockAnchor = { href: '', download: '', click: mockClick };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
    const mockCreate = vi.fn().mockReturnValue('blob:url');
    const mockRevoke = vi.fn();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(mockCreate);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(mockRevoke);

    const blob = new Blob(['test']);
    downloadBlob(blob, 'test.csv');

    expect(mockClick).toHaveBeenCalled();
    expect(mockRevoke).toHaveBeenCalledWith('blob:url');
  });
});
