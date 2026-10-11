import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { wrapper } from '@/test/queryWrapper';

const { mockRpc, mockFrom, mockMaybeSingle, mockEqUser, mockEqEmpresa, mockLoggerError } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eqEmpresa = vi.fn(() => ({ maybeSingle }));
  const eqUser = vi.fn(() => ({ eq: eqEmpresa }));
  const select = vi.fn(() => ({ eq: eqUser }));
  return {
    mockRpc: vi.fn(),
    mockFrom: vi.fn(() => ({ select })),
    mockMaybeSingle: maybeSingle,
    mockEqUser: eqUser,
    mockEqEmpresa: eqEmpresa,
    mockLoggerError: vi.fn(),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mockRpc, from: mockFrom },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));
vi.mock('@/services/loggerService', () => ({
  loggerService: { error: mockLoggerError },
}));

import { useColaboradorVinculo } from '../useColaboradorVinculo';

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ error: null });
  mockMaybeSingle.mockResolvedValue({ data: { id: 'colab-7' }, error: null });
});

describe('useColaboradorVinculo', () => {
  it('concilia via RPC e resolve o colaboradores.id do vínculo', async () => {
    const { result } = renderHook(() => useColaboradorVinculo(), { wrapper });
    await waitFor(() => expect(result.current.colaboradorId).toBe('colab-7'));
    expect(mockRpc).toHaveBeenCalledWith('vincular_colaborador_ao_usuario');
    expect(mockFrom).toHaveBeenCalledWith('colaboradores');
    expect(mockEqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockEqEmpresa).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('falha da RPC de conciliação é logada mas não derruba a resolução', async () => {
    mockRpc.mockResolvedValue({ error: { code: 'XX001', message: 'boom' } });
    const { result } = renderHook(() => useColaboradorVinculo(), { wrapper });
    await waitFor(() => expect(result.current.colaboradorId).toBe('colab-7'));
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Falha ao autovincular colaborador ao usuário',
      expect.objectContaining({ userId: 'user-1', empresaId: 'emp-1', code: 'XX001' })
    );
  });

  it('sem vínculo retorna null', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useColaboradorVinculo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.colaboradorId).toBeNull();
  });

  it('erro no select propaga para query.error e é logado', async () => {
    const err = { code: '42501', message: 'permission denied' };
    mockMaybeSingle.mockResolvedValue({ data: null, error: err });
    const { result } = renderHook(() => useColaboradorVinculo(), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Falha ao resolver vínculo colaborador↔usuário',
      expect.objectContaining({ code: '42501' })
    );
  });
});
