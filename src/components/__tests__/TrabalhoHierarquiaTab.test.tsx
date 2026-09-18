import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockBuscarPorId, mockCargoBuscarPorId, mockLocalBuscarPorId } = vi.hoisted(() => ({
  mockBuscarPorId: vi.fn(),
  mockCargoBuscarPorId: vi.fn(),
  mockLocalBuscarPorId: vi.fn(),
}));

vi.mock('@/services', () => ({
  colaboradorService: { buscarPorId: mockBuscarPorId },
}));
vi.mock('@/services/cargoService', () => ({
  cargoService: { buscarPorId: mockCargoBuscarPorId },
}));
vi.mock('@/services/localTrabalhoService', () => ({
  localTrabalhoService: { buscarPorId: mockLocalBuscarPorId },
}));
vi.mock('@/hooks/useTabelasReferencia', () => ({
  useCentrosCusto: vi.fn(() => ({ data: [], isLoading: false })),
}));
vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useTimes: vi.fn(() => ({ data: [], isLoading: false })),
  useLotacoes: vi.fn(() => ({ data: [], isLoading: false })),
}));

import { TrabalhoHierarquiaTab } from '../colaborador-detalhes/TrabalhoHierarquiaTab';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('TrabalhoHierarquiaTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows cargo/CBO from the cargos join when cargo_id is set', async () => {
    mockBuscarPorId.mockResolvedValue({
      id: 'col-1', empresa_id: 'emp-1', cargo: 'Analista Texto', cargo_id: 'cg-1',
    });
    mockCargoBuscarPorId.mockResolvedValue({ id: 'cg-1', nome: 'Analista de RH', cbo: '2524-05' });

    render(<TrabalhoHierarquiaTab colaboradorId="col-1" />, { wrapper });

    await waitFor(() => expect(screen.getByText('Analista de RH')).toBeInTheDocument());
    expect(screen.getByText('2524-05')).toBeInTheDocument();
  });

  it('falls back to the plain text cargo/cbo columns when cargo_id is not set', async () => {
    mockBuscarPorId.mockResolvedValue({
      id: 'col-2', empresa_id: 'emp-1', cargo: 'Analista Texto', cargo_id: null, cbo: '4110-05',
    });

    render(<TrabalhoHierarquiaTab colaboradorId="col-2" />, { wrapper });

    await waitFor(() => expect(screen.getByText('Analista Texto')).toBeInTheDocument());
    expect(screen.getByText('4110-05')).toBeInTheDocument();
    expect(mockCargoBuscarPorId).not.toHaveBeenCalled();
  });

  it('does not invent a gestor direto and flags it as pending modeling decision', async () => {
    mockBuscarPorId.mockResolvedValue({ id: 'col-3', empresa_id: 'emp-1', cargo: 'Analista' });

    render(<TrabalhoHierarquiaTab colaboradorId="col-3" />, { wrapper });

    await waitFor(() => expect(screen.getByText('Gestor Direto')).toBeInTheDocument());
    expect(screen.getByText(/Requer decisão de modelagem/i)).toBeInTheDocument();
  });
});
