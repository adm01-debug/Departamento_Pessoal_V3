import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useFerias', () => ({
  useFerias: vi.fn(() => ({ ferias: [] })),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/status-badge', () => ({
  StatusBadge: ({ status }: any) => <span data-testid="status-badge">{status}</span>,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

import { useFerias } from '@/hooks/useFerias';
import { CalendarioFerias } from '../ferias/CalendarioFerias';

const MOCK_FERIAS = [
  {
    id: 'f1',
    data_inicio: '2026-07-01',
    data_fim: '2026-07-30',
    status: 'aprovada',
    dias_ferias: 30,
    abono_pecuniario: false,
    adiantamento_13: false,
    colaborador: { nome_completo: 'João Silva', cargo: { nome: 'Analista' } },
  },
  {
    id: 'f2',
    data_inicio: '2026-07-10',
    data_fim: '2026-07-20',
    status: 'pendente',
    dias_ferias: 10,
    abono_pecuniario: true,
    adiantamento_13: false,
    colaborador: { nome_completo: 'Maria Souza', cargo: null },
  },
];

describe('CalendarioFerias', () => {
  it('renders Calendário de Férias title', () => {
    vi.mocked(useFerias).mockReturnValue({ ferias: [] } as any);
    render(<CalendarioFerias />);
    expect(screen.getByText('Calendário de Férias')).toBeInTheDocument();
  });

  it('renders month navigation buttons', () => {
    vi.mocked(useFerias).mockReturnValue({ ferias: [] } as any);
    render(<CalendarioFerias />);
    expect(screen.getByLabelText('Mês anterior')).toBeInTheDocument();
    expect(screen.getByLabelText('Próximo mês')).toBeInTheDocument();
  });

  it('shows empty state message when no ferias this month', () => {
    vi.mocked(useFerias).mockReturnValue({ ferias: [] } as any);
    render(<CalendarioFerias />);
    expect(screen.getByText('Nenhuma férias programada para este mês.')).toBeInTheDocument();
  });

  it('renders colaborador names from ferias data', () => {
    vi.mocked(useFerias).mockReturnValue({ ferias: MOCK_FERIAS } as any);
    render(<CalendarioFerias />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
  });

  it('renders status badges for ferias', () => {
    vi.mocked(useFerias).mockReturnValue({ ferias: MOCK_FERIAS } as any);
    render(<CalendarioFerias />);
    const badges = screen.getAllByTestId('status-badge');
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it('renders dias count for each ferias entry', () => {
    vi.mocked(useFerias).mockReturnValue({ ferias: MOCK_FERIAS } as any);
    render(<CalendarioFerias />);
    expect(screen.getByText(/30 dias/)).toBeInTheDocument();
    expect(screen.getByText(/10 dias/)).toBeInTheDocument();
  });

  it('displays current month label', () => {
    vi.mocked(useFerias).mockReturnValue({ ferias: [] } as any);
    render(<CalendarioFerias />);
    // Should show a month/year string
    const monthLabel = screen.getByText(/2026/i);
    expect(monthLabel).toBeInTheDocument();
  });
});
