import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/services', () => ({
  auditoriaService: { listar: vi.fn().mockResolvedValue([]) },
  feriasService: { getAprovacoesLog: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button role="tab" data-value={value}>{children}</button>,
}));

import { FeriasAuditTimeline } from '../ferias/FeriasAuditTimeline';

const MOCK_LOGS = [
  {
    id: 'log-001',
    acao: 'INSERT',
    dados_novos: { status: 'pendente' },
    user_email: 'rh@empresa.com',
    created_at: '2026-07-01T10:00:00Z',
  },
  {
    id: 'log-002',
    acao: 'UPDATE',
    dados_novos: { status: 'aprovada', aprovado_rh: true },
    user_email: 'gestor@empresa.com',
    created_at: '2026-07-02T10:00:00Z',
  },
];

const MOCK_APROVACOES = [
  {
    id: 'aprov-001',
    nivel: 'RH',
    status: 'aprovado',
    observacao: 'Aprovado conforme solicitação',
    created_at: '2026-07-02T12:00:00Z',
  },
];

describe('FeriasAuditTimeline', () => {
  it('renders Tudo tab filter', () => {
    render(<FeriasAuditTimeline solicitacaoId="sol-001" />);
    expect(screen.getByRole('tab', { name: /Tudo/i })).toBeInTheDocument();
  });

  it('renders Criação tab filter', () => {
    render(<FeriasAuditTimeline solicitacaoId="sol-001" />);
    expect(screen.getByRole('tab', { name: /Cria.*o/i })).toBeInTheDocument();
  });

  it('renders Aprovação tab filter', () => {
    render(<FeriasAuditTimeline solicitacaoId="sol-001" />);
    expect(screen.getByRole('tab', { name: /Aprova.*o/i })).toBeInTheDocument();
  });

  it('renders Ajustes tab filter', () => {
    render(<FeriasAuditTimeline solicitacaoId="sol-001" />);
    expect(screen.getByRole('tab', { name: /Ajustes/i })).toBeInTheDocument();
  });

  it('shows empty state when no logs', () => {
    render(<FeriasAuditTimeline solicitacaoId="sol-001" />);
    expect(screen.getByText(/Nenhum registro encontrado para este filtro/i)).toBeInTheDocument();
  });

  it('renders user email when logs provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any)
      .mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<FeriasAuditTimeline solicitacaoId="sol-001" />);
    expect(screen.getByText('rh@empresa.com')).toBeInTheDocument();
  });

  it('renders aprovacao nivel when aprovacoes provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any)
      .mockReturnValueOnce({ data: MOCK_APROVACOES, isLoading: false } as any);
    render(<FeriasAuditTimeline solicitacaoId="sol-001" />);
    expect(screen.getAllByText(/Aprova.*o RH/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders 4 tab filters total', () => {
    render(<FeriasAuditTimeline solicitacaoId="sol-001" />);
    expect(screen.getAllByRole('tab').length).toBe(4);
  });
});
