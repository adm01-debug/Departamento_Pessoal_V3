import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/services/turnoService', () => ({
  turnoService: { obterEscalaDoDia: vi.fn().mockResolvedValue(null), listarTurnos: vi.fn().mockResolvedValue([]) },
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
}));

import { PontoTodayCard } from '../ponto/PontoTodayCard';
import type { Tables } from '@/integrations/supabase/types';

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
} as unknown as Tables<'registros_ponto'>;

describe('PontoTodayCard', () => {
  it('renders Hoje title', () => {
    render(<PontoTodayCard registroHoje={REGISTRO} />);
    expect(screen.getByText('Hoje')).toBeInTheDocument();
  });

  it('shows empty state when no registro', () => {
    render(<PontoTodayCard registroHoje={null} />);
    expect(screen.getByText(/jornada ainda não começou/)).toBeInTheDocument();
  });

  it('renders Progresso da Jornada when registro present', () => {
    render(<PontoTodayCard registroHoje={REGISTRO} />);
    expect(screen.getByText(/Progresso da Jornada/)).toBeInTheDocument();
  });

  it('renders Trabalhadas label', () => {
    render(<PontoTodayCard registroHoje={REGISTRO} />);
    expect(screen.getByText('Trabalhadas')).toBeInTheDocument();
  });

  it('renders Extras label', () => {
    render(<PontoTodayCard registroHoje={REGISTRO} />);
    expect(screen.getByText('Extras')).toBeInTheDocument();
  });

  it('renders Débito label', () => {
    render(<PontoTodayCard registroHoje={REGISTRO} />);
    expect(screen.getByText('Débito')).toBeInTheDocument();
  });

  it('renders atraso badge', () => {
    render(<PontoTodayCard registroHoje={REGISTRO} />);
    expect(screen.getByText(/Atraso: 5min/)).toBeInTheDocument();
  });

  it('renders scale badge from entrada/saida esperada', () => {
    render(<PontoTodayCard registroHoje={REGISTRO} />);
    expect(screen.getByText(/08:00 - 17:00/)).toBeInTheDocument();
  });

  it('shows meal break label when in interval', () => {
    render(<PontoTodayCard registroHoje={{ ...REGISTRO, saida_intervalo: '12:00', retorno_intervalo: null }} />);
    expect(screen.getByText(/Intervalo de Almoço/)).toBeInTheDocument();
  });
  it('offers the day-scale pencil only when collaborator and company are known', () => {
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

    const { unmount } = render(
      <QueryClientProvider client={cliente}>
        <PontoTodayCard registroHoje={REGISTRO} colaboradorId="col-1" empresaId="e1" colaboradorNome="Ana" />
      </QueryClientProvider>
    );
    expect(screen.getByRole('button', { name: 'Editar escala do dia' })).toBeInTheDocument();
    unmount();

    render(<PontoTodayCard registroHoje={REGISTRO} />);
    expect(screen.queryByRole('button', { name: 'Editar escala do dia' })).not.toBeInTheDocument();
  });
});
