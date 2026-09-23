import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const { mockObterEscalaDoDia } = vi.hoisted(() => ({ mockObterEscalaDoDia: vi.fn() }));

vi.mock('@/services/turnoService', () => ({
  turnoService: { obterEscalaDoDia: mockObterEscalaDoDia, listarTurnos: vi.fn().mockResolvedValue([]) },
}));

import { PontoTodayCard } from '../ponto/PontoTodayCard';

const REGISTRO = {
  entrada_esperada: '08:00',
  saida_esperada: '17:00',
  horas_trabalhadas: '06:00',
  horas_extras: '00:00',
  horas_falta: '02:00',
  entrada_1: '08:05',
  saida_1: null,
  entrada_2: null,
  saida_2: null,
  entrada_3: null,
  saida_3: null,
  atraso_minutos: 5,
  saida_antecipada_minutos: 0,
  saida_intervalo: null,
  retorno_intervalo: null,
};

function renderCard(props: Partial<React.ComponentProps<typeof PontoTodayCard>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider, { client: qc },
      React.createElement(
        MemoryRouter, null,
        React.createElement(PontoTodayCard, { registroHoje: REGISTRO, colaboradorId: 'col-1', empresaId: 'emp-1', ...props })
      )
    )
  );
}

describe('PontoTodayCard', () => {
  beforeEach(() => {
    mockObterEscalaDoDia.mockReset();
    mockObterEscalaDoDia.mockResolvedValue({
      id: 'esc-1', turno_id: 'turno-1', turno: { nome: 'Comercial', horario_inicio: '08:00:00', horario_fim: '17:00:00' },
    });
  });

  it('renders Hoje title', () => {
    renderCard();
    expect(screen.getByText('Hoje')).toBeInTheDocument();
  });

  it('shows empty state when no registro', () => {
    renderCard({ registroHoje: null });
    expect(screen.getByText(/jornada ainda não começou/)).toBeInTheDocument();
  });

  it('renders Progresso da Jornada when registro present', () => {
    renderCard();
    expect(screen.getByText(/Progresso da Jornada/)).toBeInTheDocument();
  });

  it('renders Trabalhadas label', () => {
    renderCard();
    expect(screen.getByText('Trabalhadas')).toBeInTheDocument();
  });

  it('renders Extras label', () => {
    renderCard();
    expect(screen.getByText('Extras')).toBeInTheDocument();
  });

  it('renders Débito label', () => {
    renderCard();
    expect(screen.getByText('Débito')).toBeInTheDocument();
  });

  it('renders atraso badge', () => {
    renderCard();
    expect(screen.getByText(/Atraso · 5 min/)).toBeInTheDocument();
  });

  it('renders scale badge from escalas_trabalho -> turnos, not from registroHoje', async () => {
    renderCard();
    await waitFor(() => expect(screen.getByText(/08:00 - 17:00/)).toBeInTheDocument());
    expect(mockObterEscalaDoDia).toHaveBeenCalledWith('col-1', 'emp-1', expect.any(String));
  });

  it('shows "Escala não definida" when there is no escala for the day', async () => {
    mockObterEscalaDoDia.mockResolvedValue(null);
    renderCard();
    await waitFor(() => expect(screen.getByText('Escala não definida')).toBeInTheDocument());
  });

  it('shows meal break label when in interval', () => {
    renderCard({ registroHoje: { ...REGISTRO, saida_intervalo: '12:00', retorno_intervalo: null } });
    expect(screen.getByText(/Intervalo de Almoço/)).toBeInTheDocument();
  });
});
