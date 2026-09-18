import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockListarConsentimentos } = vi.hoisted(() => ({ mockListarConsentimentos: vi.fn() }));

vi.mock('@/services/lgpdService', () => ({
  lgpdService: { listarConsentimentos: mockListarConsentimentos },
}));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));

import { useConsentimentosColaborador } from '../useComplianceColaborador';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useConsentimentosColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); mockListarConsentimentos.mockResolvedValue([]); });

  it('calls lgpdService.listarConsentimentos with empresaId and colaboradorId', async () => {
    const { result } = renderHook(() => useConsentimentosColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarConsentimentos).toHaveBeenCalledWith('emp-1', 'col-1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useConsentimentosColaborador(''), { wrapper });
    expect(mockListarConsentimentos).not.toHaveBeenCalled();
  });
});
