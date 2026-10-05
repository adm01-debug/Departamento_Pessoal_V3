import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: [], error: null })) })),
      insert: vi.fn(() => ({ data: null, error: null })),
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ data: null, error: null })) })),
    })),
  },
}));

vi.mock('@/validators/esocial', () => ({
  validarRubricaESocial: vi.fn(() => ({ valid: true, errors: [] })),
  sugerirCorrecaoRubrica: vi.fn(() => []),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((e: unknown, d: string) => d) }));
vi.mock('@/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' ') }));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children?: ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children?: ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children?: ReactNode }) => <td>{children}</td>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props: React.ComponentProps<'input'>) => <input type="checkbox" {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  SelectValue: () => null,
}));

import { RubricasDialog } from '../folha/RubricasDialog';

describe('RubricasDialog', () => {
  it('renders Rubricas trigger button', () => {
    render(<RubricasDialog />);
    expect(screen.getByText('Rubricas')).toBeInTheDocument();
  });

  it('renders Gestão de Rubricas dialog title', () => {
    render(<RubricasDialog />);
    expect(screen.getByText('Gestão de Rubricas (Eventos)')).toBeInTheDocument();
  });

  it('renders Nova Rubrica button', () => {
    render(<RubricasDialog />);
    expect(screen.getByText('Nova Rubrica')).toBeInTheDocument();
  });

  it('renders Importar Padrão button', () => {
    render(<RubricasDialog />);
    expect(screen.getByText('Importar Padrão')).toBeInTheDocument();
  });

  it('renders Código column header', () => {
    render(<RubricasDialog />);
    expect(screen.getByText('Código')).toBeInTheDocument();
  });

  it('renders Descrição column header', () => {
    render(<RubricasDialog />);
    expect(screen.getByText('Descrição')).toBeInTheDocument();
  });

  it('renders Tipo column header', () => {
    render(<RubricasDialog />);
    expect(screen.getByText('Tipo')).toBeInTheDocument();
  });

  it('renders empty state when no rubricas', () => {
    render(<RubricasDialog />);
    expect(screen.getByText(/Nenhuma rubrica/i)).toBeInTheDocument();
  });
});
