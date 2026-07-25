import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockGetSession, mockInsert, mockFrom } = vi.hoisted(() => {
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
  const mockGetSession = vi.fn().mockResolvedValue({
    data: { session: { user: { id: 'user-1' } } },
  });
  return { mockGetSession, mockInsert, mockFrom };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    from: mockFrom,
  },
}));

import { useDataAccessLog } from '../useDataAccessLog';

describe('useDataAccessLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it('does nothing when recursoId is undefined', () => {
    renderHook(() => useDataAccessLog('colaboradores', undefined, 'emp-1'));
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('does nothing when empresaId is undefined', () => {
    renderHook(() => useDataAccessLog('colaboradores', 'c-1', undefined));
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('logs access when recursoId and empresaId are provided', async () => {
    const { rerender } = renderHook(() =>
      useDataAccessLog('colaboradores', 'c-1', 'emp-1')
    );
    rerender();
    await vi.waitFor(() => expect(mockGetSession).toHaveBeenCalled());
  });

  it('inserts audit_log record with correct fields', async () => {
    renderHook(() => useDataAccessLog('colaboradores', 'c-1', 'emp-1'));
    await vi.waitFor(() => expect(mockFrom).toHaveBeenCalledWith('audit_log'));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario_id: 'user-1',
        acao: 'VISUALIZACAO',
        tabela: 'colaboradores',
        registro_id: 'c-1',
        empresa_id: 'emp-1',
      })
    );
  });

  it('does not insert when session has no user', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderHook(() => useDataAccessLog('colaboradores', 'c-1', 'emp-1'));
    await vi.waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('does not throw when insert fails (non-blocking)', async () => {
    mockInsert.mockRejectedValue(new Error('network error'));
    expect(() =>
      renderHook(() => useDataAccessLog('colaboradores', 'c-1', 'emp-1'))
    ).not.toThrow();
  });
});
