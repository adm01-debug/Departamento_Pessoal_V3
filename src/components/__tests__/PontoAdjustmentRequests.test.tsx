import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/hooks', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
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

vi.mock('@/services/exportService', () => ({
  exportPortaria671PDF: vi.fn(),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any) => String(e)),
}));

import { PontoAdjustmentRequests } from '../ponto/PontoAdjustmentRequests';

describe('PontoAdjustmentRequests', () => {
  it('renders search input', () => {
    render(<PontoAdjustmentRequests />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders Colaborador table header', () => {
    render(<PontoAdjustmentRequests />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders Status table header', () => {
    render(<PontoAdjustmentRequests />);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders Data table header', () => {
    render(<PontoAdjustmentRequests />);
    expect(screen.getByText('Data')).toBeInTheDocument();
  });

  it('renders Motivo table header', () => {
    render(<PontoAdjustmentRequests />);
    expect(screen.getByText('Motivo')).toBeInTheDocument();
  });

  it('renders empty state when no solicitacoes', () => {
    render(<PontoAdjustmentRequests />);
    expect(screen.getByText(/Nenhuma solicitação/i)).toBeInTheDocument();
  });

  it('renders Solicitações de Ajuste title', () => {
    render(<PontoAdjustmentRequests />);
    expect(screen.getByText('Solicitações de Ajuste')).toBeInTheDocument();
  });

  it('renders 0 Pendentes badge', () => {
    render(<PontoAdjustmentRequests />);
    expect(screen.getByText('0 Pendentes')).toBeInTheDocument();
  });
});
