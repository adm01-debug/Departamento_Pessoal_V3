import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const { mockBuscarPorId, mockObterJornadaColaborador } = vi.hoisted(() => ({
  mockBuscarPorId: vi.fn(),
  mockObterJornadaColaborador: vi.fn(),
}));

vi.mock('@/services', () => ({
  colaboradorService: { buscarPorId: mockBuscarPorId },
  jornadaService: { obterJornadaColaborador: mockObterJornadaColaborador },
}));
vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));
vi.mock('@/hooks/usePonto', () => ({
  usePonto: vi.fn(() => ({ hoje: null, isLoading: false })),
}));
vi.mock('@/hooks', () => ({
  useRegistrosPontoSemana: vi.fn(() => ({ data: [], isLoading: false })),
  useSaldoBancoHoras: vi.fn(() => ({ data: 3.5, isLoading: false })),
  useEscalaAtual: vi.fn(() => ({ data: null, isLoading: false })),
  useFaltasColaborador: vi.fn(() => ({ data: [], isLoading: false })),
}));
vi.mock('@/hooks/usePontoMelhorado', () => ({
  usePontoMelhorado: vi.fn(() => ({ solicitacoes: [], isLoading: false })),
}));
vi.mock('@/components/ponto/PontoTodayCard', () => ({
  PontoTodayCard: () => <div data-testid="ponto-today" />,
}));
vi.mock('@/components/ponto/PontoWeekSummary', () => ({
  PontoWeekSummary: () => <div data-testid="ponto-week" />,
}));

import { JornadaPontoTab } from '../colaborador-detalhes/JornadaPontoTab';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(
    QueryClientProvider, { client: qc },
    React.createElement(MemoryRouter, null, children)
  );
}

describe('JornadaPontoTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows jornada semanal from the colaborador record and escala from the jornada resolvida', async () => {
    mockBuscarPorId.mockResolvedValue({ id: 'col-1', jornada_semanal: 44 });
    mockObterJornadaColaborador.mockResolvedValue({
      id: 'jor-1', horario_entrada: '08:00', horario_saida: '17:00', intervalo_minutos: 60, carga_horaria_semanal: 44,
    });
    render(<JornadaPontoTab colaboradorId="col-1" />, { wrapper });

    await waitFor(() => expect(screen.getByText('44h/semana')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('08:00 — 17:00')).toBeInTheDocument());
  });

  it('shows "Não definida" when no jornada resolves for the colaborador', async () => {
    mockBuscarPorId.mockResolvedValue({ id: 'col-1' });
    mockObterJornadaColaborador.mockResolvedValue(null);
    render(<JornadaPontoTab colaboradorId="col-1" />, { wrapper });

    await waitFor(() => expect(screen.getByText('Não definida')).toBeInTheDocument());
  });

  it('renders the ponto today and week summary widgets', async () => {
    mockBuscarPorId.mockResolvedValue({ id: 'col-1' });
    mockObterJornadaColaborador.mockResolvedValue(null);
    render(<JornadaPontoTab colaboradorId="col-1" />, { wrapper });

    await waitFor(() => expect(screen.getByTestId('ponto-today')).toBeInTheDocument());
    expect(screen.getByTestId('ponto-week')).toBeInTheDocument();
  });
});
