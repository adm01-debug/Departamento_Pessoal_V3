import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCalcular13Salario } from '../useCalcular13Salario';

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseDados = {
  colaboradorId: 'colab-1',
  salario: 5000,
  mediaVariaveis: 0,
  dataAdmissao: '2022-01-01',
  anoReferencia: 2026,
  parcela: 2 as const,
  mesesAfastamento: 0,
  dependentesIRRF: 0,
  pensaoAlimenticia: 0,
};

const mockResultado = {
  colaboradorId: 'colab-1',
  anoReferencia: 2026,
  parcela: 2,
  avos: 12,
  proventos: { salarioBase: 5000, mediaVariaveis: 0, valorBruto: 5000, valorParcela: 5000 },
  descontos: { inss: 600, irrf: 100, pensaoAlimenticia: 0, adiantamento1Parcela: 0, totalDescontos: 700 },
  liquido: 4300,
  dataLimitePagamento: '2026-12-20',
};

describe('useCalcular13Salario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initial state: loading=false, resultado=null', () => {
    const { result } = renderHook(() => useCalcular13Salario());
    expect(result.current.loading).toBe(false);
    expect(result.current.resultado).toBeNull();
  });

  it('exposes calcular function', () => {
    const { result } = renderHook(() => useCalcular13Salario());
    expect(typeof result.current.calcular).toBe('function');
  });

  it('sets loading=true while calculating', async () => {
    let resolve: (v: any) => void = () => {};
    mockInvoke.mockImplementation(() => new Promise(r => { resolve = r; }));
    const { result } = renderHook(() => useCalcular13Salario());
    act(() => { void result.current.calcular(baseDados); });
    expect(result.current.loading).toBe(true);
    act(() => { resolve({ data: { success: true, resultado: mockResultado }, error: null }); });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('sets resultado on success', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, resultado: mockResultado },
      error: null,
    });
    const { result } = renderHook(() => useCalcular13Salario());
    await act(async () => { await result.current.calcular(baseDados); });
    expect(result.current.resultado).toEqual(mockResultado);
  });

  it('calls supabase.functions.invoke with correct args', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, resultado: mockResultado },
      error: null,
    });
    const { result } = renderHook(() => useCalcular13Salario());
    await act(async () => { await result.current.calcular(baseDados); });
    expect(mockInvoke).toHaveBeenCalledWith('calcular-13-salario', { body: baseDados });
  });

  it('shows success toast with parcela number', async () => {
    const { toast } = await import('sonner');
    mockInvoke.mockResolvedValue({
      data: { success: true, resultado: mockResultado },
      error: null,
    });
    const { result } = renderHook(() => useCalcular13Salario());
    await act(async () => { await result.current.calcular(baseDados); });
    expect(toast.success).toHaveBeenCalledWith('13º Salário (2ª parcela) calculado!');
  });

  it('returns the resultado from calcular', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, resultado: mockResultado },
      error: null,
    });
    const { result } = renderHook(() => useCalcular13Salario());
    let returned: any;
    await act(async () => { returned = await result.current.calcular(baseDados); });
    expect(returned).toEqual(mockResultado);
  });

  it('shows error toast and returns null on supabase error', async () => {
    const { toast } = await import('sonner');
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge function unavailable' },
    });
    const { result } = renderHook(() => useCalcular13Salario());
    let returned: any;
    await act(async () => { returned = await result.current.calcular(baseDados); });
    expect(returned).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Erro ao calcular 13º: Edge function unavailable');
  });

  it('shows error toast when data.success is false', async () => {
    const { toast } = await import('sonner');
    mockInvoke.mockResolvedValue({
      data: { success: false, error: 'Meses insuficientes' },
      error: null,
    });
    const { result } = renderHook(() => useCalcular13Salario());
    let returned: any;
    await act(async () => { returned = await result.current.calcular(baseDados); });
    expect(returned).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Erro ao calcular 13º: Meses insuficientes');
  });

  it('resultado remains null after error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Timeout' },
    });
    const { result } = renderHook(() => useCalcular13Salario());
    await act(async () => { await result.current.calcular(baseDados); });
    expect(result.current.resultado).toBeNull();
  });

  it('loading returns to false after error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Timeout' },
    });
    const { result } = renderHook(() => useCalcular13Salario());
    await act(async () => { await result.current.calcular(baseDados); });
    expect(result.current.loading).toBe(false);
  });
});
