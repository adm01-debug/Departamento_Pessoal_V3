import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useDeficiencia: vi.fn(),
  useSalvarDeficiencia: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

import { useDeficiencia } from '@/hooks/useColaboradorDetalhes';
import { PCDTab } from '../colaborador-detalhes/PCDTab';

const PCD_DATA = { tipo: 'Visual', cid: 'H54.0', descricao: 'Cegueira', observacoes: 'Usa bengala' };

describe('PCDTab', () => {
  it('renders PCD title', () => {
    vi.mocked(useDeficiencia).mockReturnValue({ data: PCD_DATA, isLoading: false } as any);
    render(<PCDTab colaboradorId="col-1" />);
    expect(screen.getByText(/Pessoa com Deficiência/)).toBeInTheDocument();
  });

  it('shows data in read mode when data exists', () => {
    vi.mocked(useDeficiencia).mockReturnValue({ data: PCD_DATA, isLoading: false } as any);
    render(<PCDTab colaboradorId="col-1" />);
    expect(screen.getByText('Visual')).toBeInTheDocument();
    expect(screen.getByText('H54.0')).toBeInTheDocument();
  });

  it('shows no-data message in form mode when no data', () => {
    vi.mocked(useDeficiencia).mockReturnValue({ data: null, isLoading: false } as any);
    render(<PCDTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum dado cadastrado.')).toBeInTheDocument();
  });

  it('shows Editar button when data exists', () => {
    vi.mocked(useDeficiencia).mockReturnValue({ data: PCD_DATA, isLoading: false } as any);
    render(<PCDTab colaboradorId="col-1" />);
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });

  it('shows form when Editar clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useDeficiencia).mockReturnValue({ data: PCD_DATA, isLoading: false } as any);
    render(<PCDTab colaboradorId="col-1" />);
    await user.click(screen.getByText('Editar'));
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });

  it('shows Cancelar when in editing mode', async () => {
    const user = userEvent.setup();
    vi.mocked(useDeficiencia).mockReturnValue({ data: PCD_DATA, isLoading: false } as any);
    render(<PCDTab colaboradorId="col-1" />);
    await user.click(screen.getByText('Editar'));
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });
});
