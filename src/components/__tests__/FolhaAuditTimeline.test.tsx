import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

import { FolhaAuditTimeline } from '../folha/FolhaAuditTimeline';

const MOCK_LOGS = [
  {
    id: 'log-001',
    tipo_evento: 'CALCULO',
    created_at: '2026-07-01T10:00:00Z',
    mensagem: 'Folha calculada com sucesso',
    colaborador: null,
  },
];

describe('FolhaAuditTimeline', () => {
  it('renders Trilha de Processamento section title', () => {
    render(<FolhaAuditTimeline competencia="2026-07" />);
    expect(screen.getByText(/Trilha de Processamento/)).toBeInTheDocument();
  });

  it('renders competencia in the title', () => {
    render(<FolhaAuditTimeline competencia="2026-07" />);
    expect(screen.getByText(/2026-07/)).toBeInTheDocument();
  });

  it('shows empty state when no logs', () => {
    render(<FolhaAuditTimeline competencia="2026-07" />);
    expect(screen.getByText('Nenhum registro de processamento para este período.')).toBeInTheDocument();
  });

  it('renders log tipo_evento badge when logs provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<FolhaAuditTimeline competencia="2026-07" />);
    expect(screen.getByText('CALCULO')).toBeInTheDocument();
  });

  it('renders Sistema when colaborador is null', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<FolhaAuditTimeline competencia="2026-07" />);
    expect(screen.getByText('Sistema')).toBeInTheDocument();
  });

  it('renders log mensagem when provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<FolhaAuditTimeline competencia="2026-07" />);
    expect(screen.getByText('Folha calculada com sucesso')).toBeInTheDocument();
  });

  it('renders with different competencia', () => {
    render(<FolhaAuditTimeline competencia="2025-12" />);
    expect(screen.getByText(/2025-12/)).toBeInTheDocument();
  });

  it('does not show empty state when logs exist', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<FolhaAuditTimeline competencia="2026-07" />);
    expect(screen.queryByText('Nenhum registro de processamento para este período.')).not.toBeInTheDocument();
  });
});
