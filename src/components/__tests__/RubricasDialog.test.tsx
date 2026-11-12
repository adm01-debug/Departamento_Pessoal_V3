import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useMutation } from '@tanstack/react-query';

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

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
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
import { supabase } from '@/integrations/supabase/client';
import { RUBRICAS_PADRAO } from '@/constants/rubricas';

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

  it('Importar Padrão dispara a mutation de importação após confirmação', () => {
    const mutate = vi.fn();
    vi.mocked(useMutation).mockImplementation(() => ({ mutate, isPending: false }) as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<RubricasDialog />);
    fireEvent.click(screen.getByText('Importar Padrão'));
    expect(mutate).toHaveBeenCalledTimes(1);
    vi.mocked(useMutation).mockImplementation(() => ({ mutate: vi.fn(), isPending: false }) as never);
  });

  it('importação insere só os códigos padrão ainda não cadastrados, com tipo válido no banco', async () => {
    vi.mocked(useMutation).mockClear();
    render(<RubricasDialog />);
    const opcoes = vi.mocked(useMutation).mock.calls.map((c) => c[0] as { mutationFn: () => Promise<number> });
    const importar = opcoes[2];

    const insert = vi.fn(() => Promise.resolve({ error: null }));
    vi.mocked(supabase.from).mockImplementation(
      () =>
        ({
          select: vi.fn(() => Promise.resolve({ data: [{ codigo: '1000' }, { codigo: '5000' }], error: null })),
          insert,
        }) as never
    );

    const inseridas = await importar.mutationFn();

    expect(inseridas).toBe(RUBRICAS_PADRAO.length - 2);
    const payload = (insert.mock.calls[0] as unknown as [Array<{ codigo: string; tipo: string }>])[0];
    expect(payload.map((r) => r.codigo)).not.toContain('1000');
    expect(payload.map((r) => r.codigo)).not.toContain('5000');
    expect(payload.every((r) => ['provento', 'desconto', 'informativo'].includes(r.tipo))).toBe(true);
  });

  it('importação não insere nada quando todos os códigos padrão já existem', async () => {
    vi.mocked(useMutation).mockClear();
    render(<RubricasDialog />);
    const importar = vi.mocked(useMutation).mock.calls[2][0] as { mutationFn: () => Promise<number> };

    const insert = vi.fn();
    vi.mocked(supabase.from).mockImplementation(
      () =>
        ({
          select: vi.fn(() =>
            Promise.resolve({ data: RUBRICAS_PADRAO.map((r) => ({ codigo: r.codigo })), error: null })
          ),
          insert,
        }) as never
    );

    expect(await importar.mutationFn()).toBe(0);
    expect(insert).not.toHaveBeenCalled();
  });
});
