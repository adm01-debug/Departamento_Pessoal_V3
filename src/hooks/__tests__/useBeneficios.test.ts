import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockBeneficioService } = vi.hoisted(() => ({
  mockBeneficioService: {
    listar: vi.fn().mockResolvedValue({ data: [{ id: 'b1', nome: 'VT' }], total: 1 }),
    obterResumoCustos: vi.fn().mockResolvedValue({ total: 500 }),
    criar: vi.fn().mockResolvedValue({ id: 'b2' }),
    atualizar: vi.fn().mockResolvedValue({}),
    excluir: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/beneficioService', () => ({ beneficioService: mockBeneficioService }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useBeneficios } from '../useBeneficios';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useBeneficios', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns beneficios array', async () => {
    const { result } = renderHook(() => useBeneficios(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.beneficios)).toBe(true);
  });

  it('returns resumo object', async () => {
    const { result } = renderHook(() => useBeneficios(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.resumo).toBe('object');
  });

  it('exposes criarBeneficio with mutateAsync', () => {
    const { result } = renderHook(() => useBeneficios(), { wrapper });
    expect(typeof result.current.criarBeneficio.mutateAsync).toBe('function');
  });

  it('exposes atualizarBeneficio with mutateAsync', () => {
    const { result } = renderHook(() => useBeneficios(), { wrapper });
    expect(typeof result.current.atualizarBeneficio.mutateAsync).toBe('function');
  });

  it('exposes excluirBeneficio with mutateAsync', () => {
    const { result } = renderHook(() => useBeneficios(), { wrapper });
    expect(typeof result.current.excluirBeneficio.mutateAsync).toBe('function');
  });

  it('tiposBeneficio includes expected types', () => {
    const { result } = renderHook(() => useBeneficios(), { wrapper });
    expect(result.current.tiposBeneficio).toContain('transporte');
    expect(result.current.tiposBeneficio).toContain('saude');
  });
});
