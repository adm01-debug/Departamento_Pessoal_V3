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
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(PontoTodayCard, {
          registroHoje: REGISTRO,
          colaboradorId: 'col-1',
          empresaId: 'emp-1',
          ...props,
        })
      )
    )
  );
}

describe('PontoTodayCard', () => {
  beforeEach(() => {
    mockObterEscalaDoDia.mockReset();
    mockObterEscalaDoDia.mockResolvedValue({
      id: 'esc-1',
      turno_id: 'turno-1',
      turno: { nome: 'Comercial', horario_inicio: '08:00:00', horario_fim: '17:00:00' },
    });
  });

  it('renders Jornada de Hoje title', () => {
    renderCard();
    expect(screen.getByText('Jornada de Hoje')).toBeInTheDocument();
  });

  it('shows empty state when no registro', () => {
    renderCard({ registroHoje: null });
    expect(screen.getByText(/jornada ainda não começou/)).toBeInTheDocument();
  });

  // Layout compacto aprovado (referência): o painel esquerdo virou "Tempo
  // trabalhado" com anel de progresso real e o direito "Saldo do dia".
  it('renders tempo trabalhado com anel de progresso', () => {
    renderCard();
    expect(screen.getByText('Tempo trabalhado')).toBeInTheDocument();
    expect(screen.getByText('Saldo do dia')).toBeInTheDocument();
    expect(screen.getByText(/^\d+%$/)).toBeInTheDocument();
  });

  it('renders "Horas extras" label', () => {
    renderCard();
    expect(screen.getByText('Horas extras')).toBeInTheDocument();
  });

  it('renders Débito label', () => {
    renderCard();
    expect(screen.getByText('Débito')).toBeInTheDocument();
  });

  // Selo do resultado: o card não pode exibir um texto fixo — o selo acompanha
  // `saldoDia` (extras − falta), sempre em três estados.
  it('marca "Negativo" quando o débito supera as horas extras', () => {
    renderCard({ registroHoje: { ...REGISTRO, horas_extras: '00:00', horas_falta: '02:00' } });
    expect(screen.getByText('Negativo')).toBeInTheDocument();
    expect(screen.getByText('-02:00')).toBeInTheDocument();
  });

  it('marca "Positivo" quando há horas extras sobrando', () => {
    renderCard({ registroHoje: { ...REGISTRO, horas_extras: '00:45', horas_falta: '00:00' } });
    expect(screen.getByText('Positivo')).toBeInTheDocument();
    expect(screen.getByText('+00:45')).toBeInTheDocument();
  });

  it('marca "Zerado" quando extras e débito se anulam', () => {
    renderCard({ registroHoje: { ...REGISTRO, horas_extras: '00:30', horas_falta: '00:30' } });
    expect(screen.getByText('Zerado')).toBeInTheDocument();
  });

  it('renders atraso badge', () => {
    renderCard();
    expect(screen.getByText(/Atraso · 5 min/)).toBeInTheDocument();
  });

  // A escala do dia saiu da faixa principal (o card voltou à altura da
  // referência), mas continua acessível no rótulo do lápis que abre o diálogo.
  it('expõe a escala do dia em escalas_trabalho -> turnos (não em registroHoje)', async () => {
    renderCard();
    await waitFor(() => expect(screen.getByRole('button', { name: /Escala 08:00 - 17:00/ })).toBeInTheDocument());
    expect(mockObterEscalaDoDia).toHaveBeenCalledWith('col-1', 'emp-1', expect.any(String));
  });

  it('mostra "Escala não definida" quando não há escala para o dia', async () => {
    mockObterEscalaDoDia.mockResolvedValue(null);
    renderCard();
    await waitFor(() => expect(screen.getByRole('button', { name: /Escala não definida/ })).toBeInTheDocument());
  });

  it('shows meal break label when in interval', () => {
    renderCard({ registroHoje: { ...REGISTRO, saida_intervalo: '12:00', retorno_intervalo: null } });
    expect(screen.getByText(/Intervalo de Almoço/)).toBeInTheDocument();
  });
});
