import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCalculoFolha } from '../useCalculoFolha';

const mockProcessar = vi.fn();

vi.mock('@/utils/folhaCalc', () => ({
  folhaCalc: {
    processar: (...args: any[]) => mockProcessar(...args),
  },
}));

vi.mock('@/services/folha/calculoLoteService', () => ({
  calculoLoteService: {
    processarLote: vi.fn().mockResolvedValue({ success: 5, errors: 0 }),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'folhas_pagamento') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'folha-1' }, error: null }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'folha-new' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'folha_itens') {
        return {
          upsert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'item-1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'folha_auditoria') {
        return {
          insert: () => Promise.resolve({ error: null }),
        };
      }
      const chain: any = { select: () => chain, eq: () => chain, maybeSingle: () => Promise.resolve({ data: null, error: null }) };
      return chain;
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useCalculoFolha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessar.mockReturnValue({
      proventos: 3000,
      descontos: 373.41,
      liquido: 2626.59,
      inss: 373.41,
      irrf: 0,
      fgts: 240,
      detalheEventos: [],
    });
  });

  it('starts with resultado null and isCalculando false', () => {
    const { result } = renderHook(() => useCalculoFolha(), { wrapper });

    expect(result.current.resultado).toBeNull();
    expect(result.current.isCalculando).toBe(false);
  });

  it('exposes executarCalculo function', () => {
    const { result } = renderHook(() => useCalculoFolha(), { wrapper });
    expect(typeof result.current.executarCalculo).toBe('function');
  });

  it('exposes executarCalculoLote function', () => {
    const { result } = renderHook(() => useCalculoFolha(), { wrapper });
    expect(typeof result.current.executarCalculoLote).toBe('function');
  });

  it('calls folhaCalc.processar with salary and params', async () => {
    const { result } = renderHook(() => useCalculoFolha(), { wrapper });

    await act(async () => {
      await result.current.executarCalculo({
        colaboradorId: 'c1',
        empresaId: 'e1',
        competencia: '2026-01',
        salarioBase: 3000,
      });
    });

    expect(mockProcessar).toHaveBeenCalledWith(3000, undefined);
  });

  it('sets resultado after successful calculation', async () => {
    const { result } = renderHook(() => useCalculoFolha(), { wrapper });

    await act(async () => {
      await result.current.executarCalculo({
        colaboradorId: 'c1',
        empresaId: 'e1',
        competencia: '2026-01',
        salarioBase: 3000,
      });
    });

    expect(result.current.resultado).not.toBeNull();
    expect(result.current.resultado?.liquido).toBe(2626.59);
  });

  it('shows success toast on completion', async () => {
    const { result } = renderHook(() => useCalculoFolha(), { wrapper });

    await act(async () => {
      await result.current.executarCalculo({
        colaboradorId: 'c1',
        empresaId: 'e1',
        competencia: '2026-01',
        salarioBase: 3000,
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it('resetResultado clears resultado', async () => {
    const { result } = renderHook(() => useCalculoFolha(), { wrapper });

    await act(async () => {
      await result.current.executarCalculo({
        colaboradorId: 'c1',
        empresaId: 'e1',
        competencia: '2026-01',
        salarioBase: 3000,
      });
    });

    act(() => {
      result.current.resetResultado();
    });

    expect(result.current.resultado).toBeNull();
  });
});
