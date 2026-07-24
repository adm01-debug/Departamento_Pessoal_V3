import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockInvoke, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { useCalcular13Salario } from '../useCalcular13Salario';

const dados = {
  colaboradorId: 'c1',
  salario: 3000,
  mediaVariaveis: 0,
  dataAdmissao: '2025-01-01',
  anoReferencia: 2026,
  parcela: 1 as const,
  mesesAfastamento: 0,
  dependentesIRRF: 0,
  pensaoAlimenticia: 0,
};

const resultado = {
  colaboradorId: 'c1',
  anoReferencia: 2026,
  parcela: 1,
  avos: 12,
  proventos: { salarioBase: 3000, mediaVariaveis: 0, valorBruto: 3000, valorParcela: 1500 },
  descontos: { inss: 300, irrf: 0, pensaoAlimenticia: 0, adiantamento1Parcela: 0, totalDescontos: 300 },
  liquido: 1200,
  dataLimitePagamento: '2026-11-30',
};

describe('useCalcular13Salario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with loading=false and resultado=null', () => {
    const { result } = renderHook(() => useCalcular13Salario());
    expect(result.current.loading).toBe(false);
    expect(result.current.resultado).toBeNull();
  });

  it('sets resultado on successful calculation', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true, resultado }, error: null });

    const { result } = renderHook(() => useCalcular13Salario());

    await act(async () => {
      await result.current.calcular(dados);
    });

    expect(result.current.resultado).toEqual(resultado);
  });

  it('calls supabase.functions.invoke with calcular-13-salario', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true, resultado }, error: null });

    const { result } = renderHook(() => useCalcular13Salario());

    await act(async () => {
      await result.current.calcular(dados);
    });

    expect(mockInvoke).toHaveBeenCalledWith('calcular-13-salario', { body: dados });
  });

  it('shows success toast on completion', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true, resultado }, error: null });

    const { result } = renderHook(() => useCalcular13Salario());

    await act(async () => {
      await result.current.calcular(dados);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('13º Salário'));
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('1ª parcela'));
  });

  it('returns null and shows error toast when invoke returns error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('invoke fail') });

    const { result } = renderHook(() => useCalcular13Salario());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.calcular(dados);
    });

    expect(returnValue).toBeNull();
    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('invoke fail'));
  });

  it('returns null and shows error toast when success=false', async () => {
    mockInvoke.mockResolvedValue({ data: { success: false, error: 'Cálculo inválido' }, error: null });

    const { result } = renderHook(() => useCalcular13Salario());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.calcular(dados);
    });

    expect(returnValue).toBeNull();
    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('Cálculo inválido'));
  });

  it('resets loading to false after completion', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true, resultado }, error: null });

    const { result } = renderHook(() => useCalcular13Salario());

    await act(async () => {
      await result.current.calcular(dados);
    });

    expect(result.current.loading).toBe(false);
  });

  it('resets loading to false even on error', async () => {
    mockInvoke.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useCalcular13Salario());

    await act(async () => {
      await result.current.calcular(dados);
    });

    expect(result.current.loading).toBe(false);
  });
});
