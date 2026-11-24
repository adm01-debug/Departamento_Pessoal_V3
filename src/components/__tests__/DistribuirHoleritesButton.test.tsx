import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { novos: 0, total: 0, ja_distribuidos: 0 }, error: null }),
    },
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any) => String(e)),
}));

import { DistribuirHoleritesButton } from '../folha/DistribuirHoleritesButton';

describe('DistribuirHoleritesButton', () => {
  it('renders Distribuir em massa trigger button', () => {
    render(<DistribuirHoleritesButton competencia="2026-07" />);
    expect(screen.getByRole('button', { name: /Distribuir em massa/i })).toBeInTheDocument();
  });

  it('renders dialog title with competencia', () => {
    render(<DistribuirHoleritesButton competencia="2026-07" />);
    expect(screen.getByText(/Distribuir holerites — 2026-07/)).toBeInTheDocument();
  });

  it('renders Portal do Colaborador channel option', () => {
    render(<DistribuirHoleritesButton competencia="2026-07" />);
    expect(screen.getByText('Portal do Colaborador')).toBeInTheDocument();
  });

  it('renders E-mail channel option', () => {
    render(<DistribuirHoleritesButton competencia="2026-07" />);
    expect(screen.getByText('E-mail')).toBeInTheDocument();
  });

  it('renders WhatsApp channel option', () => {
    render(<DistribuirHoleritesButton competencia="2026-07" />);
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
  });

  it('renders Cancelar button', () => {
    render(<DistribuirHoleritesButton competencia="2026-07" />);
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });

  it('renders Distribuir agora button (disabled when no folha)', () => {
    render(<DistribuirHoleritesButton competencia="2026-07" />);
    expect(screen.getByRole('button', { name: /Distribuir agora/i })).toBeInTheDocument();
  });

  it('renders no-folha description when folha is null', () => {
    render(<DistribuirHoleritesButton competencia="2026-07" />);
    expect(screen.getByText(/Nenhuma folha encontrada/i)).toBeInTheDocument();
  });
});
