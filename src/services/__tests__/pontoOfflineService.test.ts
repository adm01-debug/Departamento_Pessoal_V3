import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: { success: true, success_count: 1, error_count: 0 }, error: null }) },
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
      colaborador_id: 'c1',
      timestamp: '2024-07-24T08:00:00Z',
      tipo: 'entrada',
      dispositivoId: 'dev-1',
    });
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('is deterministic for the same input', () => {
    const data = { colaborador_id: 'c1', timestamp: '2024-07-24T08:00:00Z', tipo: 'entrada', dispositivoId: 'dev-1' };
    expect(pontoOfflineService.generateIntegrityHash(data)).toBe(pontoOfflineService.generateIntegrityHash(data));
  });

  it('differs for different inputs', () => {
    const h1 = pontoOfflineService.generateIntegrityHash({ colaborador_id: 'c1', timestamp: '2024-01-01T08:00:00Z', tipo: 'entrada', dispositivoId: 'd1' });
    const h2 = pontoOfflineService.generateIntegrityHash({ colaborador_id: 'c2', timestamp: '2024-01-01T08:00:00Z', tipo: 'saida', dispositivoId: 'd2' });
    expect(h1).not.toBe(h2);
  });

  it('produces a SHA-256 hex string (64 chars)', () => {
    const hash = pontoOfflineService.generateIntegrityHash({ colaborador_id: 'c1', timestamp: '2024-07-24T08:00:00Z', tipo: 'saida', dispositivoId: 'dev-1' });
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
