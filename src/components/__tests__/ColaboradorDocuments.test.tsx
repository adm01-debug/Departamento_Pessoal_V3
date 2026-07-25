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
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableCell: ({ children, colSpan }: any) => <td colSpan={colSpan}>{children}</td>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
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

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
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
    } as any);
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
