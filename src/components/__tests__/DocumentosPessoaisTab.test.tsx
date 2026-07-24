import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useTabelasReferencia', () => ({
  useDocumentosPessoais: vi.fn(),
  useCriarDocumentoPessoal: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExcluirDocumentoPessoal: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder || ''}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

import { useDocumentosPessoais } from '@/hooks/useTabelasReferencia';
import { DocumentosPessoaisTab } from '../colaborador-detalhes/DocumentosPessoaisTab';

const MOCK_DOCS = [
  { id: 'd1', tipo_documento: 'RG', numero: '12.345.678-9', orgao_emissor: 'SSP/MG', data_emissao: '2010-05-20', data_validade: null },
];

describe('DocumentosPessoaisTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useDocumentosPessoais).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<DocumentosPessoaisTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Documentos Pessoais title', () => {
    vi.mocked(useDocumentosPessoais).mockReturnValue({ data: [], isLoading: false } as any);
    render(<DocumentosPessoaisTab colaboradorId="col-1" />);
    expect(screen.getByText('Documentos Pessoais')).toBeInTheDocument();
  });

  it('renders Adicionar button', () => {
    vi.mocked(useDocumentosPessoais).mockReturnValue({ data: [], isLoading: false } as any);
    render(<DocumentosPessoaisTab colaboradorId="col-1" />);
    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    vi.mocked(useDocumentosPessoais).mockReturnValue({ data: [], isLoading: false } as any);
    render(<DocumentosPessoaisTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum documento cadastrado.')).toBeInTheDocument();
  });

  it('renders tipo_documento badge', () => {
    vi.mocked(useDocumentosPessoais).mockReturnValue({ data: MOCK_DOCS, isLoading: false } as any);
    render(<DocumentosPessoaisTab colaboradorId="col-1" />);
    expect(screen.getAllByText('RG').length).toBeGreaterThanOrEqual(1);
  });

  it('renders numero and orgao_emissor', () => {
    vi.mocked(useDocumentosPessoais).mockReturnValue({ data: MOCK_DOCS, isLoading: false } as any);
    render(<DocumentosPessoaisTab colaboradorId="col-1" />);
    expect(screen.getByText('12.345.678-9')).toBeInTheDocument();
    expect(screen.getByText('SSP/MG')).toBeInTheDocument();
  });

  it('renders data_emissao', () => {
    vi.mocked(useDocumentosPessoais).mockReturnValue({ data: MOCK_DOCS, isLoading: false } as any);
    render(<DocumentosPessoaisTab colaboradorId="col-1" />);
    expect(screen.getByText('2010-05-20')).toBeInTheDocument();
  });
});
