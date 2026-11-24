import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useDadosEstrangeiro: vi.fn(),
  useSalvarDadosEstrangeiro: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

import { useDadosEstrangeiro } from '@/hooks/useColaboradorDetalhes';
import { EstrangeiroTab } from '../colaborador-detalhes/EstrangeiroTab';

const DATA = { pais_origem: 'Portugal', tipo_visto: 'Permanente', data_chegada: '2020-01-01', reside_brasil: true };

describe('EstrangeiroTab', () => {
  it('renders Dados de Estrangeiro title', () => {
    vi.mocked(useDadosEstrangeiro).mockReturnValue({ data: DATA, isLoading: false } as any);
    render(<EstrangeiroTab colaboradorId="col-1" />);
    expect(screen.getByText('Dados de Estrangeiro')).toBeInTheDocument();
  });

  it('shows country in read mode', () => {
    vi.mocked(useDadosEstrangeiro).mockReturnValue({ data: DATA, isLoading: false } as any);
    render(<EstrangeiroTab colaboradorId="col-1" />);
    expect(screen.getByText('Portugal')).toBeInTheDocument();
  });

  it('shows Sim badge for reside_brasil = true', () => {
    vi.mocked(useDadosEstrangeiro).mockReturnValue({ data: DATA, isLoading: false } as any);
    render(<EstrangeiroTab colaboradorId="col-1" />);
    expect(screen.getByText('Sim')).toBeInTheDocument();
  });

  it('shows no-data message when no data', () => {
    vi.mocked(useDadosEstrangeiro).mockReturnValue({ data: null, isLoading: false } as any);
    render(<EstrangeiroTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum dado cadastrado.')).toBeInTheDocument();
  });

  it('shows Editar button when data exists', () => {
    vi.mocked(useDadosEstrangeiro).mockReturnValue({ data: DATA, isLoading: false } as any);
    render(<EstrangeiroTab colaboradorId="col-1" />);
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });

  it('shows form on Editar click', async () => {
    const user = userEvent.setup();
    vi.mocked(useDadosEstrangeiro).mockReturnValue({ data: DATA, isLoading: false } as any);
    render(<EstrangeiroTab colaboradorId="col-1" />);
    await user.click(screen.getByText('Editar'));
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });
});
