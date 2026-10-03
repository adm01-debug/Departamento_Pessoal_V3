import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/services/desligamentoService', () => ({
  desligamentoService: { criar: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick }: { children?: ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { children?: ReactNode; placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked }: { checked?: boolean }) => <input type="checkbox" readOnly checked={!!checked} />,
}));

vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((e: any, d: string) => d) }));

import { NovoDesligamentoDialog } from '../desligamentos/NovoDesligamentoDialog';

describe('NovoDesligamentoDialog', () => {
  it('renders Novo Desligamento title', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Novo Desligamento')).toBeInTheDocument();
  });

  it('renders dialog description', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Registre um novo desligamento de colaborador')).toBeInTheDocument();
  });

  it('renders Colaborador * label', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Colaborador *')).toBeInTheDocument();
  });

  it('renders Data Desligamento * label', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Data Desligamento *')).toBeInTheDocument();
  });

  it('renders Tipo de Rescisão * label', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Tipo de Rescisão *')).toBeInTheDocument();
  });

  it('renders Sem Justa Causa select option', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Sem Justa Causa')).toBeInTheDocument();
  });

  it('renders Motivo label', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Motivo')).toBeInTheDocument();
  });

  it('renders Registrar Desligamento button', () => {
    render(<NovoDesligamentoDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Registrar Desligamento')).toBeInTheDocument();
  });
});
