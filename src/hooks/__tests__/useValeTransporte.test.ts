import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockCalcCustoMensal } = vi.hoisted(() => ({
  mockCalcCustoMensal: vi.fn(),
}));

vi.mock('@/services/calculoBeneficiosService', () => ({
  valeTransporteService: { calcularCustoMensal: mockCalcCustoMensal },
}));

import { useValeTransporte } from '../useValeTransporte';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useValeTransporte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns custo=undefined and isLoading=false when no colaboradorId', () => {
    const { result } = renderHook(() => useValeTransporte(undefined), { wrapper });
    expect(result.current.custo).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mockCalcCustoMensal).not.toHaveBeenCalled();
  });

  it('calls calcularCustoMensal with colaboradorId and default diasUteis=22', async () => {
    mockCalcCustoMensal.mockResolvedValue(440.5);

    const { result } = renderHook(() => useValeTransporte('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCalcCustoMensal).toHaveBeenCalledWith('col-1', 22);
  });

  it('returns custo from service', async () => {
    mockCalcCustoMensal.mockResolvedValue(380);

    const { result } = renderHook(() => useValeTransporte('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.custo).toBe(380);
  });

  it('respects custom diasUteis parameter', async () => {
    mockCalcCustoMensal.mockResolvedValue(200);

    const { result } = renderHook(() => useValeTransporte('col-1', 10), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCalcCustoMensal).toHaveBeenCalledWith('col-1', 10);
  });

  it('exposes refetch function', async () => {
    mockCalcCustoMensal.mockResolvedValue(300);

    const { result } = renderHook(() => useValeTransporte('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.refetch).toBe('function');
  });
});
