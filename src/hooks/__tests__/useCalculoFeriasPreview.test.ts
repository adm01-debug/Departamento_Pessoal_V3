import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockCalcular } = vi.hoisted(() => ({
  mockCalcular: vi.fn(),
}));

vi.mock('@/utils/calculoFerias', () => ({
  calculoFerias: { calcular: mockCalcular },
}));

import { useCalculoFeriasPreview } from '../useCalculoFeriasPreview';

const MOCK_RESULT = {
  salarioDias: 1000,
  tercoConstitucional: 333.33,
  totalBruto: 1333.33,
  inss: 100,
  irrf: 50,
  totalLiquido: 1183.33,
};

describe('useCalculoFeriasPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when enabled is false', () => {
    const { result } = renderHook(() =>
      useCalculoFeriasPreview({ salarioBase: 3000, diasFerias: 30, enabled: false })
    );
    expect(result.current).toBeNull();
    expect(mockCalcular).not.toHaveBeenCalled();
  });

  it('returns null when salarioBase is 0', () => {
    const { result } = renderHook(() =>
      useCalculoFeriasPreview({ salarioBase: 0, diasFerias: 30 })
    );
    expect(result.current).toBeNull();
  });

  it('returns null when salarioBase is negative', () => {
    const { result } = renderHook(() =>
      useCalculoFeriasPreview({ salarioBase: -100, diasFerias: 30 })
    );
    expect(result.current).toBeNull();
  });

  it('returns null when diasFerias is 0', () => {
    const { result } = renderHook(() =>
      useCalculoFeriasPreview({ salarioBase: 3000, diasFerias: 0 })
    );
    expect(result.current).toBeNull();
  });

  it('calls calculoFerias.calcular with correct params', () => {
    mockCalcular.mockReturnValue(MOCK_RESULT);
    renderHook(() =>
      useCalculoFeriasPreview({ salarioBase: 3000, diasFerias: 30, diasAbono: 10, dependentesIrrf: 2 })
    );
    expect(mockCalcular).toHaveBeenCalledWith({
      salarioBase: 3000,
      diasFerias: 30,
      diasAbono: 10,
      dependentesIrrf: 2,
    });
  });

  it('returns result from calculoFerias.calcular', () => {
    mockCalcular.mockReturnValue(MOCK_RESULT);
    const { result } = renderHook(() =>
      useCalculoFeriasPreview({ salarioBase: 3000, diasFerias: 30 })
    );
    expect(result.current).toEqual(MOCK_RESULT);
  });

  it('uses default 0 for diasAbono and dependentesIrrf', () => {
    mockCalcular.mockReturnValue(MOCK_RESULT);
    renderHook(() =>
      useCalculoFeriasPreview({ salarioBase: 3000, diasFerias: 30 })
    );
    expect(mockCalcular).toHaveBeenCalledWith(
      expect.objectContaining({ diasAbono: 0, dependentesIrrf: 0 })
    );
  });

  it('returns null when calculoFerias.calcular throws', () => {
    mockCalcular.mockImplementation(() => { throw new Error('calc error'); });
    const { result } = renderHook(() =>
      useCalculoFeriasPreview({ salarioBase: 3000, diasFerias: 30 })
    );
    expect(result.current).toBeNull();
  });
});
