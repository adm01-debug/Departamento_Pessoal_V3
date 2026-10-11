import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true, success_count: 1, error_count: 0 }, error: null }),
    },
  },
}));

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn().mockReturnValue({ objectStore: vi.fn().mockReturnValue({}) }),
    objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
  }),
}));

vi.mock('@/services/pontoMonitorService', () => ({
  pontoMonitorService: {
    logEvent: vi.fn().mockResolvedValue(undefined),
    trackOfflineSync: vi.fn().mockResolvedValue(undefined),
  },
}));

import { pontoOfflineService } from '../pontoOfflineService';

describe('pontoOfflineService.generateIntegrityHash', () => {
  it('returns a non-empty string', () => {
    const hash = pontoOfflineService.generateIntegrityHash({
      empresa_id: 'e1',
      colaborador_id: 'c1',
      timestamp: '2024-07-24T08:00:00Z',
      tipo: 'entrada',
      dispositivoId: 'dev-1',
    });
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('is deterministic for the same input', () => {
    const data = {
      colaborador_id: 'c1',
      timestamp: '2024-07-24T08:00:00Z',
      tipo: 'entrada',
      dispositivoId: 'dev-1',
    } as const;
    expect(pontoOfflineService.generateIntegrityHash({ empresa_id: 'e1', ...data })).toBe(
      pontoOfflineService.generateIntegrityHash({ empresa_id: 'e1', ...data })
    );
  });

  it('differs for different inputs', () => {
    const h1 = pontoOfflineService.generateIntegrityHash({
      empresa_id: 'e1',
      colaborador_id: 'c1',
      timestamp: '2024-01-01T08:00:00Z',
      tipo: 'entrada',
      dispositivoId: 'd1',
    });
    const h2 = pontoOfflineService.generateIntegrityHash({
      empresa_id: 'e2',
      colaborador_id: 'c2',
      timestamp: '2024-01-01T08:00:00Z',
      tipo: 'saida',
      dispositivoId: 'd2',
    });
    expect(h1).not.toBe(h2);
  });

  it('produces a SHA-256 hex string (64 chars)', () => {
    const hash = pontoOfflineService.generateIntegrityHash({
      empresa_id: 'e1',
      colaborador_id: 'c1',
      timestamp: '2024-07-24T08:00:00Z',
      tipo: 'saida',
      dispositivoId: 'dev-1',
    });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('pontoOfflineService.getQueueSize', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns 0 when localStorage is empty', () => {
    expect(pontoOfflineService.getQueueSize()).toBe(0);
  });

  it('returns 0 on corrupted data', () => {
    localStorage.setItem('ponto_offline_queue', 'not-valid-encrypted-data');
    expect(pontoOfflineService.getQueueSize()).toBe(0);
  });
});

describe('pontoOfflineService.syncOfflineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns {synced:0, errors:0} when queue is empty', async () => {
    const result = await pontoOfflineService.syncOfflineQueue();
    expect(result).toEqual({ synced: 0, errors: 0 });
  });
});

// ─── queueRegistro + syncOfflineQueue (onda 12) ─────────────────────────────

const baseReg = {
  tipo: 'entrada' as const,
  colaborador_id: 'c1',
  empresa_id: 'e1',
  timestamp: '2026-01-01T08:00:00Z',
  dispositivoId: 'dev-1',
};

async function mockInvoke() {
  const { supabase } = await import('@/integrations/supabase/client');
  return supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;
}

describe('pontoOfflineService.queueRegistro', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('gera id e hash, persiste criptografado e dispara evento', async () => {
    const spy = vi.fn();
    window.addEventListener('ponto-offline-updated', spy);
    const entry = await pontoOfflineService.queueRegistro(baseReg);
    expect(entry.id).toBeTruthy();
    expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(pontoOfflineService.getQueueSize()).toBe(1);
    expect(spy).toHaveBeenCalled();
    window.removeEventListener('ponto-offline-updated', spy);
  });

  it('reutiliza hash já calculado quando fornecido', async () => {
    const entry = await pontoOfflineService.queueRegistro({ ...baseReg, hash: 'h-fixo' });
    expect(entry.hash).toBe('h-fixo');
  });

  it('foto vai para o IndexedDB e não para a fila local', async () => {
    const entry = await pontoOfflineService.queueRegistro({
      ...baseReg,
      foto_base64: 'data:image/png;base64,AAA',
    });
    expect(entry.foto_base64).toBeNull();
    expect(entry.has_photo_in_idb).toBe(true);
    expect(pontoOfflineService.getQueueSize()).toBe(1);
  });
});

describe('pontoOfflineService.syncOfflineQueue — caminhos de sincronização', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('dados corrompidos: errors:1 e remove a fila', async () => {
    localStorage.setItem('ponto_offline_queue', 'corrupted-blob');
    const r = await pontoOfflineService.syncOfflineQueue();
    expect(r).toEqual({ synced: 0, errors: 1 });
    expect(localStorage.getItem('ponto_offline_queue')).toBeNull();
  });

  it('sucesso total: sincroniza e esvazia a fila', async () => {
    await pontoOfflineService.queueRegistro(baseReg);
    const r = await pontoOfflineService.syncOfflineQueue();
    expect(r).toEqual({ synced: 1, errors: 0 });
    expect(pontoOfflineService.getQueueSize()).toBe(0);
  });

  it('falha de comunicação: errors = tamanho da fila e fila preservada', async () => {
    await pontoOfflineService.queueRegistro(baseReg);
    (await mockInvoke()).mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    const r = await pontoOfflineService.syncOfflineQueue();
    expect(r).toEqual({ synced: 0, errors: 1 });
    expect(pontoOfflineService.getQueueSize()).toBe(1);
  });

  it('details: mantém na fila apenas os registros que falharam', async () => {
    const a = await pontoOfflineService.queueRegistro(baseReg);
    const b = await pontoOfflineService.queueRegistro(baseReg);
    (await mockInvoke()).mockResolvedValueOnce({
      data: { success: 1, success_count: 1, error_count: 1, details: [{ id: b.id }] },
      error: null,
    });
    const r = await pontoOfflineService.syncOfflineQueue();
    expect(r).toEqual({ synced: 1, errors: 1 });
    expect(pontoOfflineService.getQueueSize()).toBe(1);
    expect(a.id).not.toBe(b.id);
  });
});
