import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockGetSession, mockRpc, mockFrom } = vi.hoisted(() => {
  const mockRpc = vi.fn().mockResolvedValue({ data: 'audit-1', error: null });
  const mockFrom = vi.fn();
  const mockGetSession = vi.fn().mockResolvedValue({
    data: { session: { user: { id: 'user-1' } } },
  });
  return { mockGetSession, mockRpc, mockFrom };
});

// O hook usa o cliente base (não o proxy do bridge) — o mock precisa apontar
// exatamente para esse módulo, senão nada é interceptado.
vi.mock('@/integrations/supabase/client.base', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    rpc: mockRpc,
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
    mockRpc.mockResolvedValue({ data: 'audit-1', error: null });
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

  it('registra o acesso pela RPC segura, sem escrita direta na tabela', async () => {
    renderHook(() => useDataAccessLog('colaboradores', 'c-1', 'emp-1'));
    await vi.waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('registrar_auditoria', expect.any(Object))
    );
    expect(mockFrom).not.toHaveBeenCalled();

    const args = mockRpc.mock.calls[0][1];
    expect(args).toMatchObject({
      p_tabela: 'colaboradores',
      p_registro_id: 'c-1',
      p_acao: 'VISUALIZACAO',
      p_empresa_id: 'emp-1',
    });
    // Autoria derivada de auth.uid() no servidor — nunca enviada pelo cliente.
    expect(Object.keys(args)).not.toContain('p_user_id');
  });

  it('does not log when session has no user', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderHook(() => useDataAccessLog('colaboradores', 'c-1', 'emp-1'));
    await vi.waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('does not throw when the audit call fails (non-blocking)', async () => {
    mockRpc.mockRejectedValue(new Error('network error'));
    expect(() =>
      renderHook(() => useDataAccessLog('colaboradores', 'c-1', 'emp-1'))
    ).not.toThrow();
  });
});
