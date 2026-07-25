import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: { signed_url: 'https://example.com/doc.pdf', versao: 1 }, error: null }) },
  },
}));

vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((_e: any, f: string) => f) }));
vi.mock('@/utils/safeUrl', () => ({ safeHref: vi.fn((u: string) => u) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...p }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...p}>{children}</button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children }: any) => <div data-testid="trigger">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input data-testid="input" {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectValue: () => null,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

vi.mock('lucide-react', () => ({ FileText: () => <span />, Loader2: () => <span /> }));

import { GerarLtcatOsButton } from '../sst/GerarLtcatOsButton';

describe('GerarLtcatOsButton', () => {
  it('renders trigger button with "Gerar LTCAT / OS" text', () => {
    render(<GerarLtcatOsButton />);
    expect(screen.getByText('Gerar LTCAT / OS')).toBeTruthy();
  });

  it('renders dialog title', () => {
    render(<GerarLtcatOsButton />);
    expect(screen.getByText('Gerar Documento Técnico SST')).toBeTruthy();
  });

  it('shows LTCAT description text', () => {
    render(<GerarLtcatOsButton />);
    expect(screen.getByText(/Ordem de Serviço/)).toBeTruthy();
  });

  it('renders Gerar button initially not loading', () => {
    render(<GerarLtcatOsButton />);
    expect(screen.getByText('Gerar e assinar documento')).toBeTruthy();
  });

  it('shows toast error when titulo is empty on submit', async () => {
    const { toast } = await import('sonner');
    render(<GerarLtcatOsButton />);
    const btn = screen.getByText('Gerar e assinar documento').closest('button')!;
    fireEvent.click(btn);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Preencha título e responsável técnico'));
  });

  it('invokes supabase function when form is valid', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    render(<GerarLtcatOsButton />);

    const inputs = screen.getAllByTestId('input');
    // First input is titulo
    fireEvent.change(inputs[0], { target: { value: 'OS Teste' } });
    // Second input is responsavel_nome
    fireEvent.change(inputs[1], { target: { value: 'Dr. João' } });

    const btn = screen.getByText('Gerar e assinar documento').closest('button')!;
    fireEvent.click(btn);

    await waitFor(() => expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'gerar-ltcat-os',
      expect.objectContaining({ body: expect.objectContaining({ tipo: 'os' }) })
    ));
  });

  it('shows success toast after successful generation', async () => {
    const { toast } = await import('sonner');
    render(<GerarLtcatOsButton />);

    const inputs = screen.getAllByTestId('input');
    fireEvent.change(inputs[0], { target: { value: 'OS Teste' } });
    fireEvent.change(inputs[1], { target: { value: 'Dr. João' } });

    fireEvent.click(screen.getByText('Gerar e assinar documento').closest('button')!);

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });
});
