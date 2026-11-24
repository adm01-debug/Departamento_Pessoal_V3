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
vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((e: any, d: string) => d) }));
vi.mock('@/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' ') }));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props: any) => <input type="checkbox" {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
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
