import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useDocumentos', () => ({
  useDocumentos: vi.fn(() => ({
    documentos: [],
    isLoading: false,
    criarDocumento: { mutateAsync: vi.fn(), isPending: false },
    excluirDocumento: { mutate: vi.fn() },
  })),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children?: ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children?: ReactNode }) => <th>{children}</th>,
  TableCell: ({ children, colSpan }: { children?: ReactNode; colSpan?: number }) => (
    <td colSpan={colSpan}>{children}</td>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
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
  SelectValue: () => null,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('date-fns', () => ({ format: vi.fn(() => '24/07/2026') }));
vi.mock('date-fns/locale', () => ({ ptBR: {} }));
vi.mock('@/utils/safeUrl', () => ({ safeHref: (url: string) => url }));

import { ColaboradorDocuments } from '../colaborador-detalhes/ColaboradorDocuments';

describe('ColaboradorDocuments', () => {
  it('renders Gestão de Documentos Digitais heading', () => {
    render(<ColaboradorDocuments colaboradorId="col-001" />);
    expect(screen.getByText('Gestão de Documentos Digitais')).toBeInTheDocument();
  });

  it('renders Novo Documento button', () => {
    render(<ColaboradorDocuments colaboradorId="col-001" />);
    expect(screen.getByText('Novo Documento')).toBeInTheDocument();
  });

  it('renders Adicionar Novo Documento dialog title', () => {
    render(<ColaboradorDocuments colaboradorId="col-001" />);
    expect(screen.getByText('Adicionar Novo Documento')).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    render(<ColaboradorDocuments colaboradorId="col-001" />);
    expect(screen.getByText('Documento')).toBeInTheDocument();
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Upload em')).toBeInTheDocument();
    expect(screen.getByText('Validade')).toBeInTheDocument();
    expect(screen.getByText('Ações')).toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    render(<ColaboradorDocuments colaboradorId="col-001" />);
    expect(screen.getByText('Nenhum documento anexado.')).toBeInTheDocument();
  });

  it('shows spinner when loading', async () => {
    const { useDocumentos } = await import('@/hooks/useDocumentos');
    vi.mocked(useDocumentos).mockReturnValueOnce({
      documentos: [],
      isLoading: true,
      criarDocumento: { mutateAsync: vi.fn(), isPending: false },
      excluirDocumento: { mutate: vi.fn() },
    } as never);
    render(<ColaboradorDocuments colaboradorId="col-001" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Nome do Documento label in form', () => {
    render(<ColaboradorDocuments colaboradorId="col-001" />);
    expect(screen.getByText('Nome do Documento *')).toBeInTheDocument();
  });

  it('renders Salvar Documento com Segurança button', () => {
    render(<ColaboradorDocuments colaboradorId="col-001" />);
    expect(screen.getByText('Salvar Documento com Segurança')).toBeInTheDocument();
  });

  it('renders Contrato de Trabalho tipo option', () => {
    render(<ColaboradorDocuments colaboradorId="col-001" />);
    expect(screen.getByText('Contrato de Trabalho')).toBeInTheDocument();
  });
});
