import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks', () => ({
  useHoleritesColaborador: vi.fn(),
}));
vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import { useHoleritesColaborador } from '@/hooks';
import { HoleritesTab } from '../colaborador-detalhes/HoleritesTab';

describe('HoleritesTab', () => {
  it('shows spinner while loading', () => {
    vi.mocked(useHoleritesColaborador).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<HoleritesTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('shows empty state when there are no holerites', () => {
    vi.mocked(useHoleritesColaborador).mockReturnValue({ data: [], isLoading: false } as any);
    render(<HoleritesTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum holerite encontrado para este colaborador.')).toBeInTheDocument();
  });

  it('renders competencia, líquido and signature status per holerite', () => {
    vi.mocked(useHoleritesColaborador).mockReturnValue({
      data: [{ id: 'h1', competencia: '2026-01', total_liquido: 5000, total_proventos: 6000, assinado: true }],
      isLoading: false,
    } as any);
    render(<HoleritesTab colaboradorId="col-1" />);
    expect(screen.getByText('2026-01')).toBeInTheDocument();
    expect(screen.getByText('Assinado')).toBeInTheDocument();
  });

  it('shows pending signature badge when not signed', () => {
    vi.mocked(useHoleritesColaborador).mockReturnValue({
      data: [{ id: 'h2', competencia: '2026-02', total_liquido: 100, total_proventos: 120, assinado: false }],
      isLoading: false,
    } as any);
    render(<HoleritesTab colaboradorId="col-1" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });
});
