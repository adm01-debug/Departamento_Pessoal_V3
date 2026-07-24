import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/useHistoricoContratos', () => ({
  useHistoricoContratos: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useHistoricoContratos } from '@/hooks/useHistoricoContratos';
import { HistoricoContratosTab } from '../colaborador-detalhes/HistoricoContratosTab';

const MOCK_HISTORICO = [
  {
    id: 'h1',
    data_inicio: '2023-01-01',
    cargo: 'Analista',
    departamento: 'TI',
    tipo_contrato: 'CLT',
    salario: 5000,
    carga_horaria_semanal: 40,
    motivo_alteracao: 'Admissão',
  },
];

describe('HistoricoContratosTab', () => {
  it('shows loading state', () => {
    vi.mocked(useHistoricoContratos).mockReturnValue({
      historico: [], isLoading: true, criar: vi.fn(), excluir: vi.fn(),
    } as any);
    render(<HistoricoContratosTab colaboradorId="col-1" />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders Histórico de Contratos title', () => {
    vi.mocked(useHistoricoContratos).mockReturnValue({
      historico: [], isLoading: false, criar: vi.fn(), excluir: vi.fn(),
    } as any);
    render(<HistoricoContratosTab colaboradorId="col-1" />);
    expect(screen.getByText('Histórico de Contratos')).toBeInTheDocument();
  });

  it('renders Nova Alteração button', () => {
    vi.mocked(useHistoricoContratos).mockReturnValue({
      historico: [], isLoading: false, criar: vi.fn(), excluir: vi.fn(),
    } as any);
    render(<HistoricoContratosTab colaboradorId="col-1" />);
    expect(screen.getByText('Nova Alteração')).toBeInTheDocument();
  });

  it('shows empty state message', () => {
    vi.mocked(useHistoricoContratos).mockReturnValue({
      historico: [], isLoading: false, criar: vi.fn(), excluir: vi.fn(),
    } as any);
    render(<HistoricoContratosTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhuma alteração contratual')).toBeInTheDocument();
  });

  it('renders historico row data', () => {
    vi.mocked(useHistoricoContratos).mockReturnValue({
      historico: MOCK_HISTORICO, isLoading: false, criar: vi.fn(), excluir: vi.fn(),
    } as any);
    render(<HistoricoContratosTab colaboradorId="col-1" />);
    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
    expect(screen.getByText('Analista')).toBeInTheDocument();
    expect(screen.getByText('Admissão')).toBeInTheDocument();
  });

  it('renders salário formatted as BRL', () => {
    vi.mocked(useHistoricoContratos).mockReturnValue({
      historico: MOCK_HISTORICO, isLoading: false, criar: vi.fn(), excluir: vi.fn(),
    } as any);
    render(<HistoricoContratosTab colaboradorId="col-1" />);
    expect(screen.getByText(/5\.000/)).toBeInTheDocument();
  });

  it('renders carga horária with h suffix', () => {
    vi.mocked(useHistoricoContratos).mockReturnValue({
      historico: MOCK_HISTORICO, isLoading: false, criar: vi.fn(), excluir: vi.fn(),
    } as any);
    render(<HistoricoContratosTab colaboradorId="col-1" />);
    expect(screen.getByText('40h')).toBeInTheDocument();
  });

  it('shows form when Nova Alteração is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useHistoricoContratos).mockReturnValue({
      historico: [], isLoading: false, criar: vi.fn(), excluir: vi.fn(),
    } as any);
    render(<HistoricoContratosTab colaboradorId="col-1" />);
    await user.click(screen.getByText('Nova Alteração'));
    expect(screen.getByText('Data Início *')).toBeInTheDocument();
    expect(screen.getByText('Motivo da Alteração *')).toBeInTheDocument();
  });
});
