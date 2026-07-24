import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const {
  mockGetQueueSize, mockQueueRegistro, mockSyncOfflineQueue,
  mockToastWarning, mockToastSuccess, mockToastError,
} = vi.hoisted(() => ({
  mockGetQueueSize: vi.fn(),
  mockQueueRegistro: vi.fn(),
  mockSyncOfflineQueue: vi.fn(),
  mockToastWarning: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/services/pontoOfflineService', () => ({
  pontoOfflineService: {
    getQueueSize: mockGetQueueSize,
    queueRegistro: mockQueueRegistro,
    syncOfflineQueue: mockSyncOfflineQueue,
  },
}));

vi.mock('sonner', () => ({
  toast: { warning: mockToastWarning, success: mockToastSuccess, error: mockToastError },
}));

import { usePontoOffline } from '../usePontoOffline';

describe('usePontoOffline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetQueueSize.mockReturnValue(0);
    mockSyncOfflineQueue.mockResolvedValue({ synced: 0, errors: 0 });
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
  });

  it('exposes offlineBatidasCount, addOffline, sync, isSyncing', () => {
    const { result } = renderHook(() => usePontoOffline());
    expect(typeof result.current.offlineBatidasCount).toBe('number');
    expect(typeof result.current.addOffline).toBe('function');
    expect(typeof result.current.sync).toBe('function');
    expect(typeof result.current.isSyncing).toBe('boolean');
  });

  it('initializes offlineBatidasCount from getQueueSize', () => {
    mockGetQueueSize.mockReturnValue(3);
    const { result } = renderHook(() => usePontoOffline());
    expect(result.current.offlineBatidasCount).toBe(3);
  });

  it('addOffline calls queueRegistro and shows warning toast', async () => {
    mockQueueRegistro.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePontoOffline());

    await act(async () => {
      await result.current.addOffline('entrada', 'col-1', { lat: -23.5, lng: -46.6 });
    });

    expect(mockQueueRegistro).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'entrada',
      colaborador_id: 'col-1',
      latitude: -23.5,
      longitude: -46.6,
    }));
    expect(mockToastWarning).toHaveBeenCalled();
  });

  it('addOffline shows error toast when queueRegistro throws', async () => {
    mockQueueRegistro.mockRejectedValue(new Error('storage full'));
    const { result } = renderHook(() => usePontoOffline());

    await act(async () => {
      await result.current.addOffline('saida', 'col-1', null);
    });

    expect(mockToastError).toHaveBeenCalledWith('Falha ao salvar ponto offline.');
  });

  it('sync shows success toast when synced > 0', async () => {
    mockSyncOfflineQueue.mockResolvedValue({ synced: 2, errors: 0 });
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => usePontoOffline());

    await act(async () => {
      await result.current.sync();
    });

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('2 batida(s) offline sincronizada(s) com sucesso!'));
  });

  it('sync shows error toast when errors > 0', async () => {
    mockSyncOfflineQueue.mockResolvedValue({ synced: 0, errors: 1 });
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => usePontoOffline());

    await act(async () => {
      await result.current.sync();
    });

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining('1 batida(s) não puderam ser sincronizadas')
    ));
  });

  it('sync does nothing when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => usePontoOffline());

    await act(async () => {
      await result.current.sync();
    });

    expect(mockSyncOfflineQueue).not.toHaveBeenCalled();
  });
});
