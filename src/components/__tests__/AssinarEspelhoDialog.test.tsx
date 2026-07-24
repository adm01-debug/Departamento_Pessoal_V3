import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('@/utils/dateLocal', () => ({
  todayLocalISO: () => '2026-07-24',
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

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

import { AssinarEspelhoDialog } from '../ponto/AssinarEspelhoDialog';

const DEFAULT_PROPS = {
  colaboradorId: 'col-1',
  colaboradorNome: 'João Silva',
};

describe('AssinarEspelhoDialog', () => {
  it('renders default trigger button', () => {
    render(<AssinarEspelhoDialog {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Assinar espelho/i })).toBeInTheDocument();
  });

  it('renders dialog title', () => {
    render(<AssinarEspelhoDialog {...DEFAULT_PROPS} />);
    expect(screen.getByText('Assinatura digital de espelho de ponto')).toBeInTheDocument();
  });

  it('renders colaborador name in description', () => {
    render(<AssinarEspelhoDialog {...DEFAULT_PROPS} />);
    expect(screen.getByText(/João Silva/)).toBeInTheDocument();
  });

  it('renders Competência label', () => {
    render(<AssinarEspelhoDialog {...DEFAULT_PROPS} />);
    expect(screen.getByText('Competência (mês)')).toBeInTheDocument();
  });

  it('renders month input with default value from today', () => {
    const { container } = render(<AssinarEspelhoDialog {...DEFAULT_PROPS} />);
    const input = container.querySelector('input[type="month"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('2026-07');
  });

  it('renders Assinar agora button', () => {
    render(<AssinarEspelhoDialog {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Assinar agora/i })).toBeInTheDocument();
  });

  it('renders Cancelar button', () => {
    render(<AssinarEspelhoDialog {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });

  it('renders custom trigger when trigger prop provided', () => {
    render(<AssinarEspelhoDialog {...DEFAULT_PROPS} trigger={<button>Meu Trigger</button>} />);
    expect(screen.getByRole('button', { name: /Meu Trigger/i })).toBeInTheDocument();
  });
});
