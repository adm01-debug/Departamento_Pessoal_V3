import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportarBackupCSV, exportarBackupJSON, downloadBlob } from '../backupService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mockFrom } }));
vi.mock('@/utils/dateLocal', () => ({ formatDateLocalISO: () => '2026-07-24' }));

function setupSelectLimit(data: any[] | null, error: any = null) {
  const limitFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ limit: limitFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { limitFn, selectFn };
}

// ─── exportarBackupCSV ────────────────────────────────────────────────────────

describe('exportarBackupCSV', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns blob, fileName and stats when data is present', async () => {
    setupSelectLimit([{ id: '1', nome: 'Alice' }, { id: '2', nome: 'Bob' }]);
    const result = await exportarBackupCSV(['colaboradores']);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.fileName).toBeTruthy();
    expect(result.stats).toBeDefined();
  });

  it('fileName includes date from formatDateLocalISO', async () => {
    setupSelectLimit([]);
    const { fileName } = await exportarBackupCSV(['colaboradores']);
    expect(fileName).toContain('2026-07-24');
  });

  it('stats.tabelas equals the number of tables passed', async () => {
    setupSelectLimit([]);
    const { stats } = await exportarBackupCSV(['colaboradores', 'departamentos']);
    expect(stats.tabelas).toBe(2);
  });

  it('stats.registros counts total records across all tables', async () => {
    setupSelectLimit([{ id: '1' }, { id: '2' }, { id: '3' }]);
    const { stats } = await exportarBackupCSV(['colaboradores']);
    expect(stats.registros).toBe(3);
  });

  it('CSV blob content type is text/csv;charset=utf-8;', async () => {
    setupSelectLimit([]);
    const { blob } = await exportarBackupCSV(['colaboradores']);
    expect(blob.type).toBe('text/csv;charset=utf-8;');
  });

  it('returns stats with 0 registros when all table fetches fail', async () => {
    setupSelectLimit(null, { message: 'DB error' });
    const { stats } = await exportarBackupCSV(['colaboradores', 'departamentos']);
    expect(stats.registros).toBe(0);
  });
});

// ─── exportarBackupJSON ───────────────────────────────────────────────────────

describe('exportarBackupJSON', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns blob with correct JSON content type', async () => {
    setupSelectLimit([]);
    const { blob } = await exportarBackupJSON(['colaboradores']);
    expect(blob.type).toBe('application/json;charset=utf-8;');
  });

  it('blob contains dados keys for each table', async () => {
    setupSelectLimit([{ id: '1' }]);
    const { blob } = await exportarBackupJSON(['colaboradores']);
    const text = await blob.text();
    const json = JSON.parse(text);
    expect(json.dados).toHaveProperty('colaboradores');
  });

  it('stats.tabelas matches table count', async () => {
    setupSelectLimit([]);
    const { stats } = await exportarBackupJSON(['colaboradores', 'departamentos']);
    expect(stats.tabelas).toBe(2);
  });
});

// ─── downloadBlob ─────────────────────────────────────────────────────────────

describe('downloadBlob', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

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
