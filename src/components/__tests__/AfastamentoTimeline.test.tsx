import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useAfastamentos', () => ({
  useProrrogacoesAfastamento: vi.fn(() => ({ prorrogacoes: [], isLoading: false })),
  useAfastamentos: vi.fn(() => ({ afastamentos: [] })),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/services/afastamentoService', () => ({
  afastamentoService: { calcularDias: vi.fn(() => 10) },
}));

vi.mock('date-fns', () => ({
  format: vi.fn(() => '01/07/2026'),
}));

vi.mock('date-fns/locale', () => ({ ptBR: {} }));

import { AfastamentoTimeline } from '../afastamentos/AfastamentoTimeline';

describe('AfastamentoTimeline', () => {
  it('renders Spinner when loading', async () => {
    const { useProrrogacoesAfastamento } = await import('@/hooks/useAfastamentos');
    vi.mocked(useProrrogacoesAfastamento).mockReturnValueOnce({ prorrogacoes: [], isLoading: true } as any);
    render(<AfastamentoTimeline afastamentoId="af-001" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Linha do Tempo heading', () => {
    render(<AfastamentoTimeline afastamentoId="af-001" />);
    expect(screen.getByText(/Linha do Tempo do Afastamento/i)).toBeInTheDocument();
  });

  it('renders Registro Inicial badge', () => {
    render(<AfastamentoTimeline afastamentoId="af-001" />);
    expect(screen.getByText('Registro Inicial')).toBeInTheDocument();
  });

  it('renders Início label', () => {
    render(<AfastamentoTimeline afastamentoId="af-001" />);
    expect(screen.getByText('Início')).toBeInTheDocument();
  });

  it('renders Fim Original label', () => {
    render(<AfastamentoTimeline afastamentoId="af-001" />);
    expect(screen.getByText('Fim Original')).toBeInTheDocument();
  });

  it('shows dash when afastamento not found', () => {
    render(<AfastamentoTimeline afastamentoId="af-999" />);
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders timeline wrapper', () => {
    const { container } = render(<AfastamentoTimeline afastamentoId="af-001" />);
    expect(container.querySelector('.space-y-6')).toBeInTheDocument();
  });

  it('renders carregando text in loading state', async () => {
    const { useProrrogacoesAfastamento } = await import('@/hooks/useAfastamentos');
    vi.mocked(useProrrogacoesAfastamento).mockReturnValueOnce({ prorrogacoes: [], isLoading: true } as any);
    render(<AfastamentoTimeline afastamentoId="af-001" />);
    expect(screen.getByText(/Carregando histórico/i)).toBeInTheDocument();
  });
});
