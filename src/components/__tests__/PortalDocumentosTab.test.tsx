import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/services', () => ({
  documentoService: {
    listarDocumentos: vi.fn(),
    criar: vi.fn(),
    excluir: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/file' } }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

vi.mock('@/components/ui/signature/SignatureCanvas', () => ({
  SignatureCanvas: () => <div data-testid="signature-canvas" />,
}));

import { useQuery } from '@tanstack/react-query';
import { PortalDocumentosTab } from '../portal/PortalDocumentosTab';

const MOCK_DOCS = [
  { id: 'd1', nome: 'Contrato de Trabalho.pdf', tipo: 'Contrato', status: 'pendente', created_at: '2024-06-01T10:00:00Z', storage_path: 'col_1/contrato.pdf' },
  { id: 'd2', nome: 'RG.pdf', tipo: 'RG', status: 'assinado', created_at: '2024-05-15T08:00:00Z', storage_path: 'col_1/rg.pdf' },
];

describe('PortalDocumentosTab', () => {
  it('renders Gestão de Documentos title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<PortalDocumentosTab navigate={vi.fn()} colaboradorId="col-1" />);
    expect(screen.getByText('Gestão de Documentos')).toBeInTheDocument();
  });

  it('renders Enviar Novo button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<PortalDocumentosTab navigate={vi.fn()} colaboradorId="col-1" />);
    expect(screen.getByText('Enviar Novo')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = render(<PortalDocumentosTab navigate={vi.fn()} colaboradorId="col-1" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<PortalDocumentosTab navigate={vi.fn()} colaboradorId="col-1" />);
    expect(screen.getByText('Você ainda não enviou nenhum documento.')).toBeInTheDocument();
  });

  it('renders quick links', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<PortalDocumentosTab navigate={vi.fn()} colaboradorId="col-1" />);
    expect(screen.getByText('Documentos Pessoais')).toBeInTheDocument();
    expect(screen.getByText('Holerites')).toBeInTheDocument();
  });

  it('renders document names when data is loaded', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_DOCS, isLoading: false } as any);
    render(<PortalDocumentosTab navigate={vi.fn()} colaboradorId="col-1" />);
    expect(screen.getByText('Contrato de Trabalho.pdf')).toBeInTheDocument();
    expect(screen.getByText('RG.pdf')).toBeInTheDocument();
  });

  it('renders document type badges', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_DOCS, isLoading: false } as any);
    render(<PortalDocumentosTab navigate={vi.fn()} colaboradorId="col-1" />);
    expect(screen.getByText('Contrato')).toBeInTheDocument();
    expect(screen.getByText('RG')).toBeInTheDocument();
  });

  it('renders Meus Arquivos Recentes section title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<PortalDocumentosTab navigate={vi.fn()} colaboradorId="col-1" />);
    expect(screen.getByText('Meus Arquivos Recentes')).toBeInTheDocument();
  });
});
