import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockMutate = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useMutation: (opts: any) => ({
    mutate: () => mockMutate(opts),
    mutateAsync: async () => opts.mutationFn?.(),
    isPending: false,
  }),
  useQuery: ({ queryFn }: any) => ({
    data: queryFn ? [] : undefined,
  }),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { signed_url: 'https://example.com/pgr.pdf', versao: 1, hash_sha256: 'abc' },
        error: null,
      }),
    },
    storage: {
      from: () => ({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/dl.pdf' },
          error: null,
        }),
      }),
    },
  },
}));

vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((_e: any, f: string) => f) }));
vi.mock('@/utils/safeUrl', () => ({ safeHref: vi.fn((u: string) => u) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...p }: any) => (
    <button onClick={onClick} disabled={disabled} {...p}>{children}</button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    <div data-open={open}>{children}</div>
  ),
  DialogTrigger: ({ children }: any) => <div data-testid="trigger">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div data-testid="footer">{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input data-testid="input" {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

vi.mock('lucide-react', () => ({
  FileText: () => <span />,
  Loader2: () => <span />,
  Download: () => <span data-testid="download-icon" />,
  ShieldCheck: () => <span />,
}));

import { GerarPgrButton } from '../sst/GerarPgrButton';

describe('GerarPgrButton', () => {
  it('renders trigger button with "Gerar PGR (NR-01)" text', () => {
    render(<GerarPgrButton />);
    expect(screen.getByText('Gerar PGR (NR-01)')).toBeTruthy();
  });

  it('renders dialog title', () => {
    render(<GerarPgrButton />);
    expect(screen.getByText('Gerador de PGR — NR-01')).toBeTruthy();
  });

  it('renders Responsável Técnico label', () => {
    render(<GerarPgrButton />);
    expect(screen.getByText('Responsável Técnico *')).toBeTruthy();
  });

  it('renders Registro Profissional label', () => {
    render(<GerarPgrButton />);
    expect(screen.getByText('Registro Profissional')).toBeTruthy();
  });

  it('renders Gerar nova versão button', () => {
    render(<GerarPgrButton />);
    expect(screen.getByText('Gerar nova versão')).toBeTruthy();
  });

  it('renders Fechar button', () => {
    render(<GerarPgrButton />);
    expect(screen.getByText('Fechar')).toBeTruthy();
  });

  it('renders empty versions message when no programas', () => {
    render(<GerarPgrButton />);
    expect(screen.getByText('Nenhuma versão gerada ainda')).toBeTruthy();
  });

  it('renders input fields for responsavel and registro', () => {
    render(<GerarPgrButton />);
    const inputs = screen.getAllByTestId('input');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('accepts text in responsavel input', () => {
    render(<GerarPgrButton />);
    const inputs = screen.getAllByTestId('input');
    fireEvent.change(inputs[0], { target: { value: 'Eng. Carlos' } });
    expect((inputs[0] as HTMLInputElement).value).toBe('Eng. Carlos');
  });

  it('shows toast.error when responsavel is empty on submit', async () => {
    const { toast } = await import('sonner');
    render(<GerarPgrButton />);
    const gerarBtn = screen.getByText('Gerar nova versão').closest('button')!;
    fireEvent.click(gerarBtn);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
