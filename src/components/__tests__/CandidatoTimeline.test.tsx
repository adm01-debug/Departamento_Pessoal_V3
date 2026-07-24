import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner">loading...</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('date-fns', () => ({
  format: vi.fn(() => '01 de jan, 10:00'),
}));

vi.mock('date-fns/locale', () => ({ ptBR: {} }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

import { CandidatoTimeline } from '../recrutamento/CandidatoTimeline';

const MOCK_ENTREVISTA = {
  id: 'e-001',
  type: 'entrevista',
  tipo: 'presencial',
  status: 'realizada',
  feedback: 'Ótimo desempenho',
  nota: 4,
  created_at: '2026-07-01T10:00:00',
};

const MOCK_TESTE = {
  id: 't-001',
  type: 'teste',
  nome_teste: 'Teste React',
  status: 'entregue',
  nota: 8,
  comentarios: 'Aprovado com distinção',
  created_at: '2026-07-01T09:00:00',
};

const MOCK_ANOTACAO = {
  id: 'a-001',
  type: 'anotacao',
  anotacao: 'Candidato com perfil excepcional',
  created_at: '2026-07-01T08:00:00',
};

describe('CandidatoTimeline', () => {
  it('renders Spinner when loading', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: undefined, isLoading: true } as any);
    render(<CandidatoTimeline candidaturaId="cand-001" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders empty state when timeline is empty', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<CandidatoTimeline candidaturaId="cand-001" />);
    expect(screen.getByText(/Inicie o processo para ver o histórico/i)).toBeInTheDocument();
  });

  it('renders Entrevista type label', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [MOCK_ENTREVISTA], isLoading: false } as any);
    render(<CandidatoTimeline candidaturaId="cand-001" />);
    expect(screen.getByText('Entrevista')).toBeInTheDocument();
  });

  it('renders Avaliação Técnica type label', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [MOCK_TESTE], isLoading: false } as any);
    render(<CandidatoTimeline candidaturaId="cand-001" />);
    expect(screen.getByText('Avaliação Técnica')).toBeInTheDocument();
  });

  it('renders Anotação type label', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [MOCK_ANOTACAO], isLoading: false } as any);
    render(<CandidatoTimeline candidaturaId="cand-001" />);
    expect(screen.getByText('Anotação')).toBeInTheDocument();
  });

  it('renders status badge for entrevista', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [MOCK_ENTREVISTA], isLoading: false } as any);
    render(<CandidatoTimeline candidaturaId="cand-001" />);
    expect(screen.getByText('realizada')).toBeInTheDocument();
  });

  it('renders anotacao text in italic block', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [MOCK_ANOTACAO], isLoading: false } as any);
    const { container } = render(<CandidatoTimeline candidaturaId="cand-001" />);
    expect(container.textContent).toContain('Candidato com perfil excepcional');
  });

  it('renders nota for teste item', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [MOCK_TESTE], isLoading: false } as any);
    const { container } = render(<CandidatoTimeline candidaturaId="cand-001" />);
    expect(container.textContent).toContain('Resultado: 8');
  });
});
