import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('@/components/ui/module-skeleton', () => ({
  CardSkeleton: ({ className }: any) => <div data-testid="card-skeleton" className={className} />,
}));

vi.mock('@/services/edgeFunctionsService', () => ({
  edgeFunctionsService: { gerarGuias: vi.fn() },
}));

import { useQuery } from '@tanstack/react-query';
import { MorningBriefing } from '../dashboard/MorningBriefing';

const MOCK_BRIEFING = {
  aniversariantes: [],
  feriasPeriodo: [{ nome: 'Maria Souza', inicio: '2026-07-20', fim: '2026-08-10' }],
  afastadosHoje: [],
  admissoesHoje: [{ nome: 'Pedro Costa', cargo: 'Analista' }],
  vencimentosHoje: [],
  totalAtivos: 42,
  pontosRegistradosHoje: 38,
  esocialHealth: 95,
};

describe('MorningBriefing', () => {
  it('separa o cache por empresa e não consulta sem tenant selecionado', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, error: null } as any);
    const { rerender } = render(<MorningBriefing />);
    expect(useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ['morning-briefing', undefined],
        enabled: false,
      })
    );

    rerender(<MorningBriefing empresaId="emp-1" />);
    expect(useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ['morning-briefing', 'emp-1'],
        enabled: true,
      })
    );
  });

  it('shows skeleton when loading', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    render(<MorningBriefing />);
    expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
  });

  it('renders error state when error occurs', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Schema error'),
    } as any);
    render(<MorningBriefing />);
    expect(screen.getByText(/Erro de Esquema/)).toBeInTheDocument();
  });

  it('renders Painel de Comando title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_BRIEFING, isLoading: false, error: null } as any);
    render(<MorningBriefing />);
    expect(screen.getByText('Painel de Comando')).toBeInTheDocument();
  });

  it('renders total ativos count', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_BRIEFING, isLoading: false, error: null } as any);
    render(<MorningBriefing />);
    expect(screen.getByText(/42 colaboradores ativos/)).toBeInTheDocument();
  });

  it('não declara 100% de conformidade quando não há eventos eSocial', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { ...MOCK_BRIEFING, esocialHealth: null },
      isLoading: false,
      error: null,
    } as any);
    render(<MorningBriefing empresaId="emp-1" />);
    expect(screen.getByText('Conformidade eSocial: sem eventos')).toBeInTheDocument();
  });

  it('renders pontos registrados hoje badge', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_BRIEFING, isLoading: false, error: null } as any);
    render(<MorningBriefing />);
    expect(screen.getByText(/38 pontos registrados hoje/)).toBeInTheDocument();
  });

  it('renders eSocial conformidade badge', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_BRIEFING, isLoading: false, error: null } as any);
    render(<MorningBriefing />);
    expect(screen.getByText(/Conformidade eSocial: 95%/)).toBeInTheDocument();
  });

  it('renders em ferias badge when there are ferias', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_BRIEFING, isLoading: false, error: null } as any);
    render(<MorningBriefing />);
    expect(screen.getByText(/1 em férias/)).toBeInTheDocument();
  });

  it('renders admissoes previstas section', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_BRIEFING, isLoading: false, error: null } as any);
    render(<MorningBriefing />);
    expect(screen.getByText(/Admissões previstas hoje/)).toBeInTheDocument();
  });
});
