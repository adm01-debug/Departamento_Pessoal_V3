import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('@/services/esocialService', () => ({
  listarEventosPorCompetencia: vi.fn(),
}));

import { useQuery } from '@tanstack/react-query';
import { FolhaESocialSync } from '../folha/FolhaESocialSync';

const MOCK_EVENTOS = [
  { tipo_evento: 'S-1200', status: 'enviado', updated_at: '2026-07-01' },
  { tipo_evento: 'S-1200', status: 'enviado', updated_at: '2026-07-01' },
  { tipo_evento: 'S-1210', status: 'pendente', updated_at: null },
  { tipo_evento: 'S-1299', status: 'enviado', updated_at: '2026-07-02' },
];

describe('FolhaESocialSync', () => {
  it('renders Integração eSocial title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() } as any);
    render(<FolhaESocialSync competencia="07/2026" />);
    expect(screen.getByText('Integração eSocial')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() } as any);
    render(<FolhaESocialSync competencia="07/2026" />);
    expect(screen.getByRole('button', { name: /Atualizar/i })).toBeInTheDocument();
  });

  it('renders Progresso Geral de Transmissão label', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() } as any);
    render(<FolhaESocialSync competencia="07/2026" />);
    expect(screen.getByText('Progresso Geral de Transmissão')).toBeInTheDocument();
  });

  it('renders S-1200, S-1210, S-1299 events', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() } as any);
    render(<FolhaESocialSync competencia="07/2026" />);
    expect(screen.getByText('S-1200 - Remuneração')).toBeInTheDocument();
    expect(screen.getByText('S-1210 - Pagamentos')).toBeInTheDocument();
    expect(screen.getByText('S-1299 - Fechamento')).toBeInTheDocument();
  });

  it('renders Painel Geral button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() } as any);
    render(<FolhaESocialSync competencia="07/2026" />);
    expect(screen.getByRole('button', { name: /Painel Geral/i })).toBeInTheDocument();
  });

  it('renders Conciliar button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() } as any);
    render(<FolhaESocialSync competencia="07/2026" />);
    expect(screen.getByRole('button', { name: /Conciliar/i })).toBeInTheDocument();
  });

  it('shows Pendente badges when no data', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() } as any);
    render(<FolhaESocialSync competencia="07/2026" />);
    const badges = screen.getAllByText('Pendente');
    expect(badges.length).toBeGreaterThanOrEqual(3);
  });

  it('renders correct processed counts when data provided', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_EVENTOS, isLoading: false, refetch: vi.fn() } as any);
    render(<FolhaESocialSync competencia="07/2026" />);
    expect(screen.getByText(/2 de 2 colaboradores/)).toBeInTheDocument();
  });
});
