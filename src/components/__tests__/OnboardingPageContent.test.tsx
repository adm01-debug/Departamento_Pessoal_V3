import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div> },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div role="progressbar" aria-valuenow={value} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import { useQuery } from '@tanstack/react-query';
import OnboardingPageContent from '../admissoes/OnboardingPageContent';

const MOCK_ONBOARDING = [
  {
    id: 'onb-1',
    nome: 'Lucas Mendes',
    cargo: 'Desenvolvedor',
    departamento: 'TI',
    data_prevista: '2026-08-01',
    tarefas: [
      { id: 't1', titulo: 'Criar conta de e-mail', concluida: false },
      { id: 't2', titulo: 'Configurar acesso', concluida: true },
    ],
  },
];

describe('OnboardingPageContent', () => {
  it('shows loading spinner while fetching', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: true } as any);
    const { container } = render(<OnboardingPageContent />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no onboarding data', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByText('Nenhum onboarding ativo')).toBeInTheDocument();
  });

  it('shows empty state description', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByText('Inicie uma nova admissão para ver a jornada aqui.')).toBeInTheDocument();
  });

  it('renders colaborador name from onboarding data', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByText('Lucas Mendes')).toBeInTheDocument();
  });

  it('renders Progresso do Onboarding text', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByText('Progresso do Onboarding')).toBeInTheDocument();
  });

  it('renders Tarefas Críticas section', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByText('Tarefas Críticas')).toBeInTheDocument();
  });

  it('renders task titles from onboarding', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByText('Criar conta de e-mail')).toBeInTheDocument();
  });

  it('renders Enviar E-mail de Boas-Vindas button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByText(/Enviar E-mail de Boas-Vindas/i)).toBeInTheDocument();
  });

  it('shows no-tasks message when tarefas array is empty', () => {
    const data = [{ ...MOCK_ONBOARDING[0], tarefas: [] }];
    vi.mocked(useQuery).mockReturnValue({ data, isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByText('Nenhuma tarefa pendente para esta etapa.')).toBeInTheDocument();
  });
});
