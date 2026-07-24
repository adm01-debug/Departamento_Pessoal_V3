import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

import { useQuery } from '@tanstack/react-query';
import { DocumentoTimeline } from '../documents/DocumentoTimeline';

const MOCK_HISTORICO = [
  {
    id: 'h1',
    versao: 1,
    created_at: '2025-06-15T10:00:00Z',
    alteracoes: 'Documento criado inicialmente',
    tamanho: 2048,
    usuario: null,
  },
  {
    id: 'h2',
    versao: 2,
    created_at: '2025-07-01T14:30:00Z',
    alteracoes: null,
    tamanho: 3072,
    usuario: null,
  },
];

describe('DocumentoTimeline', () => {
  it('shows loading state', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    render(<DocumentoTimeline documentoId="doc-1" />);
    expect(screen.getByText(/Carregando histórico/)).toBeInTheDocument();
  });

  it('shows empty state when no history', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false, error: null } as any);
    render(<DocumentoTimeline documentoId="doc-1" />);
    expect(screen.getByText(/Nenhum histórico disponível/)).toBeInTheDocument();
  });

  it('renders Histórico de Versões title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_HISTORICO, isLoading: false, error: null } as any);
    render(<DocumentoTimeline documentoId="doc-1" />);
    expect(screen.getByText(/Histórico de Versões/)).toBeInTheDocument();
  });

  it('renders version badge for each entry', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_HISTORICO, isLoading: false, error: null } as any);
    render(<DocumentoTimeline documentoId="doc-1" />);
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('renders alteracoes text when provided', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_HISTORICO, isLoading: false, error: null } as any);
    render(<DocumentoTimeline documentoId="doc-1" />);
    expect(screen.getByText('Documento criado inicialmente')).toBeInTheDocument();
  });

  it('renders Nova versão enviada fallback when alteracoes is null', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_HISTORICO, isLoading: false, error: null } as any);
    render(<DocumentoTimeline documentoId="doc-1" />);
    expect(screen.getByText('Nova versão enviada')).toBeInTheDocument();
  });

  it('renders Sistema label for entries', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_HISTORICO, isLoading: false, error: null } as any);
    render(<DocumentoTimeline documentoId="doc-1" />);
    const sistemaLabels = screen.getAllByText('Sistema');
    expect(sistemaLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders file size in KB', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_HISTORICO, isLoading: false, error: null } as any);
    render(<DocumentoTimeline documentoId="doc-1" />);
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
  });
});
