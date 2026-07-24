import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockListarDependentes, mockCriarDependente, mockAtualizarDependente, mockExcluirDependente,
  mockListarContatosEmergencia, mockCriarContatoEmergencia, mockExcluirContatoEmergencia,
} = vi.hoisted(() => ({
  mockListarDependentes: vi.fn(),
  mockCriarDependente: vi.fn(),
  mockAtualizarDependente: vi.fn(),
  mockExcluirDependente: vi.fn(),
  mockListarContatosEmergencia: vi.fn(),
  mockCriarContatoEmergencia: vi.fn(),
  mockExcluirContatoEmergencia: vi.fn(),
}));

vi.mock('@/services/colaboradorDetalhesService', () => ({
  listarDependentes: mockListarDependentes,
  criarDependente: mockCriarDependente,
  atualizarDependente: mockAtualizarDependente,
  excluirDependente: mockExcluirDependente,
  listarContatosEmergencia: mockListarContatosEmergencia,
  criarContatoEmergencia: mockCriarContatoEmergencia,
  excluirContatoEmergencia: mockExcluirContatoEmergencia,
}));

import {
  useDependentes,
  useCriarDependente,
  useContatosEmergencia,
  useCriarContatoEmergencia,
} from '../useColaboradorDetalhes';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useDependentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarDependentes.mockResolvedValue([]);
  });

  it('calls listarDependentes with colaboradorId', async () => {
    const { result } = renderHook(() => useDependentes('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarDependentes).toHaveBeenCalledWith('col-1');
  });

  it('returns dependentes from service', async () => {
    const deps = [{ id: 'd1', nome: 'Filho 1' }];
    mockListarDependentes.mockResolvedValue(deps);
    const { result } = renderHook(() => useDependentes('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(deps);
  });

  it('is disabled when colaboradorId is empty', async () => {
    const { result } = renderHook(() => useDependentes(''), { wrapper });
    await waitFor(() => !result.current.isLoading);
    expect(mockListarDependentes).not.toHaveBeenCalled();
  });
});

describe('useCriarDependente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarDependente.mockResolvedValue({ id: 'd1' });
  });

  it('calls criarDependente with provided data', async () => {
    const { result } = renderHook(() => useCriarDependente(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ colaborador_id: 'col-1', nome: 'Filho' });
    });

    expect(mockCriarDependente.mock.calls[0][0]).toEqual({ colaborador_id: 'col-1', nome: 'Filho' });
  });
});

describe('useContatosEmergencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarContatosEmergencia.mockResolvedValue([]);
  });

  it('calls listarContatosEmergencia with colaboradorId', async () => {
    const { result } = renderHook(() => useContatosEmergencia('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarContatosEmergencia).toHaveBeenCalledWith('col-1');
  });

  it('returns contatos from service', async () => {
    const contatos = [{ id: 'c1', nome: 'Mãe' }];
    mockListarContatosEmergencia.mockResolvedValue(contatos);
    const { result } = renderHook(() => useContatosEmergencia('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(contatos);
  });
});

describe('useCriarContatoEmergencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarContatoEmergencia.mockResolvedValue({ id: 'c1' });
  });

  it('calls criarContatoEmergencia with data', async () => {
    const { result } = renderHook(() => useCriarContatoEmergencia(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ colaborador_id: 'col-1', nome: 'Mãe' });
    });

    expect(mockCriarContatoEmergencia.mock.calls[0][0]).toMatchObject({ nome: 'Mãe' });
  });
});
