import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
}));

vi.mock('@/services', () => ({
  medidasDisciplinaresService: { listarHistorico: vi.fn() },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('lucide-react', () => ({
  GitBranch: () => <svg />,
  CheckCircle2: () => <svg />,
  XCircle: () => <svg />,
  MessageSquareWarning: () => <svg />,
  Send: () => <svg />,
  Archive: () => <svg />,
  Gavel: () => <svg />,
  ShieldCheck: () => <svg />,
}));

vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('01/07/2026 10:00'),
  parseISO: vi.fn((s: string) => new Date(s)),
}));

vi.mock('date-fns/locale', () => ({ ptBR: {} }));

import { MedidaWorkflowTimeline } from '../medidas-disciplinares/MedidaWorkflowTimeline';

const MOCK_LOG = [
  {
    id: 'log-1',
    acao: 'enviar_aprovacao',
    from_status: 'rascunho',
    to_status: 'pendente_aprovacao',
    observacao: 'Enviado para RH',
    created_at: '2026-07-01T09:00:00Z',
  },
  {
    id: 'log-2',
    acao: 'aprovar',
    from_status: 'pendente_aprovacao',
    to_status: 'aprovada',
    observacao: null,
    created_at: '2026-07-01T10:00:00Z',
  },
];

describe('MedidaWorkflowTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when isLoading is true', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true });
    render(<MedidaWorkflowTimeline medidaId="m-1" />);
    expect(screen.getByText('Carregando timeline…')).toBeInTheDocument();
  });

  it('shows empty state when no log entries', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    render(<MedidaWorkflowTimeline medidaId="m-1" />);
    expect(screen.getByText('Nenhuma transição registrada.')).toBeInTheDocument();
  });

  it('renders log entries when data is available', () => {
    mockUseQuery.mockReturnValue({ data: MOCK_LOG, isLoading: false });
    render(<MedidaWorkflowTimeline medidaId="m-1" />);
    expect(screen.getByText('Enviada para aprovação')).toBeInTheDocument();
    expect(screen.getByText('Aprovada')).toBeInTheDocument();
  });

  it('renders observacao when present', () => {
    mockUseQuery.mockReturnValue({ data: [MOCK_LOG[0]], isLoading: false });
    render(<MedidaWorkflowTimeline medidaId="m-1" />);
    expect(screen.getByText('Enviado para RH')).toBeInTheDocument();
  });

  it('renders status transition badge', () => {
    mockUseQuery.mockReturnValue({ data: [MOCK_LOG[0]], isLoading: false });
    render(<MedidaWorkflowTimeline medidaId="m-1" />);
    expect(screen.getByText('rascunho → pendente_aprovacao')).toBeInTheDocument();
  });

  it('uses correct queryKey with medidaId', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    render(<MedidaWorkflowTimeline medidaId="m-42" />);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['medida-workflow-log', 'm-42'] })
    );
  });

  it('is enabled when medidaId is provided', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    render(<MedidaWorkflowTimeline medidaId="m-1" />);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });

  it('shows fallback label for unknown acao type', () => {
    const unknownLog = [{ id: 'l1', acao: 'unknown_action', from_status: null, to_status: null, observacao: null, created_at: '2026-07-01T10:00:00Z' }];
    mockUseQuery.mockReturnValue({ data: unknownLog, isLoading: false });
    render(<MedidaWorkflowTimeline medidaId="m-1" />);
    expect(screen.getByText('unknown_action')).toBeInTheDocument();
  });
});
