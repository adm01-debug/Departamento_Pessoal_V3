import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableCell: ({ children, colSpan }: any) => <td colSpan={colSpan}>{children}</td>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('date-fns', () => ({
  format: vi.fn(() => '01/07/2026 10:00'),
}));

vi.mock('date-fns/locale', () => ({ ptBR: {} }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

import { BeneficioHistorico } from '../beneficios/BeneficioHistorico';

const MOCK_MOVIMENTACOES = [
  {
    id: 'mov-001',
    tipo_movimentacao: 'adesao',
    created_at: '2026-07-01T10:00:00',
    motivo: 'Admissão do colaborador',
    colaboradores: { nome_completo: 'Pedro Alves' },
    beneficios: { nome: 'Plano de Saúde' },
  },
  {
    id: 'mov-002',
    tipo_movimentacao: 'exclusao',
    created_at: '2026-06-01T09:00:00',
    motivo: null,
    colaboradores: { nome_completo: 'Lucia Campos' },
    beneficios: { nome: 'Vale Refeição' },
  },
];

describe('BeneficioHistorico', () => {
  it('renders Spinner when loading', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: undefined, isLoading: true } as any);
    render(<BeneficioHistorico beneficioId="ben-001" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Data column header', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<BeneficioHistorico beneficioId="ben-001" />);
    expect(screen.getByText('Data')).toBeInTheDocument();
  });

  it('renders Tipo column header', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<BeneficioHistorico beneficioId="ben-001" />);
    expect(screen.getByText('Tipo')).toBeInTheDocument();
  });

  it('renders Colaborador header when beneficioId is set', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<BeneficioHistorico beneficioId="ben-001" />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders Benefício header when colaboradorId is set', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<BeneficioHistorico colaboradorId="col-001" />);
    expect(screen.getByText('Benefício')).toBeInTheDocument();
  });

  it('renders empty state message when no movimentacoes', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<BeneficioHistorico beneficioId="ben-001" />);
    expect(screen.getByText(/Nenhuma movimentação registrada/i)).toBeInTheDocument();
  });

  it('renders adesao badge', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_MOVIMENTACOES, isLoading: false } as any);
    render(<BeneficioHistorico beneficioId="ben-001" />);
    expect(screen.getByText('adesao')).toBeInTheDocument();
  });

  it('renders colaborador name when beneficioId provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_MOVIMENTACOES, isLoading: false } as any);
    render(<BeneficioHistorico beneficioId="ben-001" />);
    expect(screen.getByText('Pedro Alves')).toBeInTheDocument();
  });
});
