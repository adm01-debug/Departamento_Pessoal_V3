import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useTimelineFuncional', () => ({
  useTimelineFuncional: vi.fn(),
}));
vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }));

import { useTimelineFuncional } from '@/hooks/useTimelineFuncional';
import { TimelineFuncionalTab } from '../colaborador-detalhes/TimelineFuncionalTab';

describe('TimelineFuncionalTab', () => {
  it('shows spinner while loading', () => {
    vi.mocked(useTimelineFuncional).mockReturnValue({ eventos: [], isLoading: true });
    render(<TimelineFuncionalTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('shows empty state when there are no events', () => {
    vi.mocked(useTimelineFuncional).mockReturnValue({ eventos: [], isLoading: false });
    render(<TimelineFuncionalTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum evento funcional encontrado para este colaborador.')).toBeInTheDocument();
  });

  it('renders each event with its date and titulo', () => {
    vi.mocked(useTimelineFuncional).mockReturnValue({
      eventos: [
        { data: '2026-01-01', tipo: 'admissao', titulo: 'Admissão', origem: 'colaboradores' },
        { data: '2025-01-01', tipo: 'salario', titulo: 'Alteração salarial', descricao: 'Reajuste', origem: 'historico_salarial' },
      ],
      isLoading: false,
    });
    render(<TimelineFuncionalTab colaboradorId="col-1" />);
    expect(screen.getByText('Admissão')).toBeInTheDocument();
    expect(screen.getByText('2026-01-01')).toBeInTheDocument();
    expect(screen.getByText('Alteração salarial')).toBeInTheDocument();
    expect(screen.getByText('Reajuste')).toBeInTheDocument();
  });
});
