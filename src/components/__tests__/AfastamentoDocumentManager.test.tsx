import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useAfastamentos', () => ({
  useDocumentosAfastamento: vi.fn(() => ({
    documentos: [],
    isLoading: false,
    upload: vi.fn(),
    isUploading: false,
    excluir: vi.fn(),
  })),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, asChild, ...props }: any) => (
    <button disabled={disabled} onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: () => null,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('date-fns', () => ({ format: vi.fn(() => '24/07/2026') }));
vi.mock('date-fns/locale', () => ({ ptBR: {} }));
vi.mock('@/utils/safeUrl', () => ({ safeHref: (url: string) => url }));

import { AfastamentoDocumentManager } from '../afastamentos/AfastamentoDocumentManager';

describe('AfastamentoDocumentManager', () => {
  it('renders Tipo de Documento label', () => {
    render(<AfastamentoDocumentManager afastamentoId="af-001" />);
    expect(screen.getByText('Tipo de Documento')).toBeInTheDocument();
  });

  it('renders Arquivo label', () => {
    render(<AfastamentoDocumentManager afastamentoId="af-001" />);
    expect(screen.getByText('Arquivo')).toBeInTheDocument();
  });

  it('renders Fazer Upload button', () => {
    render(<AfastamentoDocumentManager afastamentoId="af-001" />);
    expect(screen.getByText('Fazer Upload')).toBeInTheDocument();
  });

  it('Fazer Upload button is disabled when no file selected', () => {
    render(<AfastamentoDocumentManager afastamentoId="af-001" />);
    const btn = screen.getByRole('button', { name: /Fazer Upload/i });
    expect(btn).toBeDisabled();
  });

  it('renders Documentos Anexados heading', () => {
    render(<AfastamentoDocumentManager afastamentoId="af-001" />);
    expect(screen.getByText(/Documentos Anexados/i)).toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    render(<AfastamentoDocumentManager afastamentoId="af-001" />);
    expect(screen.getByText('Nenhum documento anexado.')).toBeInTheDocument();
  });

  it('renders Atestado Médico option', () => {
    render(<AfastamentoDocumentManager afastamentoId="af-001" />);
    expect(screen.getByText('Atestado Médico')).toBeInTheDocument();
  });

  it('shows spinner when loading', async () => {
    const { useDocumentosAfastamento } = await import('@/hooks/useAfastamentos');
    vi.mocked(useDocumentosAfastamento).mockReturnValueOnce({
      documentos: [],
      isLoading: true,
      upload: vi.fn(),
      isUploading: false,
      excluir: vi.fn(),
    } as any);
    render(<AfastamentoDocumentManager afastamentoId="af-001" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
});
