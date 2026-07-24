import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pontoMonitorService } from '../pontoMonitorService';

const { mockFrom, mockGetUser, mockToastError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
}));

vi.mock('sonner', () => ({
  toast: { error: mockToastError },
}));

function setupInsert(error: any = null) {
  const insertFn = vi.fn().mockResolvedValue({ error });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn };
}

// ─── logEvent ─────────────────────────────────────────────────────────────────

describe('pontoMonitorService.logEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('inserts event into ponto_auditoria', async () => {
    const { insertFn } = setupInsert();
    await pontoMonitorService.logEvent('TEST_EVENT', { key: 'val' });
    expect(mockFrom).toHaveBeenCalledWith('ponto_auditoria');
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      tabela_nome: 'SYSTEM_EVENT',
      acao: 'TEST_EVENT',
      dados_novos: { key: 'val' },
    }));
  });

  it('includes usuario_id from auth.getUser', async () => {
    const { insertFn } = setupInsert();
    await pontoMonitorService.logEvent('EV', {});
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      usuario_id: 'user-1',
    }));
  });

  it('swallows DB errors silently (no throw)', async () => {
    setupInsert({ message: 'fail' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(pontoMonitorService.logEvent('EV', {})).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });

  it('swallows auth errors silently', async () => {
    mockGetUser.mockRejectedValue(new Error('auth fail'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(pontoMonitorService.logEvent('EV', {})).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});

// ─── trackGeofenceFailure ─────────────────────────────────────────────────────

describe('pontoMonitorService.trackGeofenceFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('calls logEvent with GEOFENCE_FAILURE and correct payload', async () => {
    const { insertFn } = setupInsert();
    await pontoMonitorService.trackGeofenceFailure('col-1', -23.5, -46.6, 100);
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'GEOFENCE_FAILURE',
      dados_novos: expect.objectContaining({
        colaboradorId: 'col-1',
        coords: { lat: -23.5, lng: -46.6 },
        radius: 100,
      }),
    }));
  });
});

// ─── trackOfflineSync ─────────────────────────────────────────────────────────

describe('pontoMonitorService.trackOfflineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('calls logEvent with OFFLINE_SYNC_COMPLETE', async () => {
    const { insertFn } = setupInsert();
    await pontoMonitorService.trackOfflineSync(5, 0);
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'OFFLINE_SYNC_COMPLETE',
      dados_novos: expect.objectContaining({ syncedCount: 5, errorCount: 0 }),
    }));
  });

  it('shows toast.error when errorCount > 0', async () => {
    setupInsert();
    await pontoMonitorService.trackOfflineSync(3, 2);
    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('2'));
  });

  it('does not call toast.error when errorCount is 0', async () => {
    setupInsert();
    await pontoMonitorService.trackOfflineSync(5, 0);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
