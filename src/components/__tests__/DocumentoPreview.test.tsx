import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/utils/safeUrl', () => ({
  safeHref: (url: string) => url || '',
}));

import { DocumentoPreview } from '../documents/DocumentoPreview';

const PDF_DOC = {
  nome: 'contrato.pdf',
  nome_arquivo: 'contrato.pdf',
  tipo: 'contrato',
  mime_type: 'application/pdf',
  url: 'https://example.com/contrato.pdf',
  created_at: '2026-07-24T10:00:00Z',
};

const IMAGE_DOC = {
  nome: 'foto.jpg',
  nome_arquivo: 'foto.jpg',
  tipo: 'foto',
  mime_type: 'image/jpeg',
  url: 'https://example.com/foto.jpg',
  created_at: '2026-07-24T10:00:00Z',
};

const UNKNOWN_DOC = {
  nome: 'arquivo.xlsx',
  nome_arquivo: 'arquivo.xlsx',
  tipo: 'relatorio',
  mime_type: 'application/vnd.ms-excel',
  url: 'https://example.com/arquivo.xlsx',
  created_at: '2026-07-24T10:00:00Z',
};

describe('DocumentoPreview', () => {
  it('renders null when documento is null', () => {
    const { container } = render(
      <DocumentoPreview documento={null} isOpen={true} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders document name in title', () => {
    render(<DocumentoPreview documento={PDF_DOC} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('contrato.pdf')).toBeInTheDocument();
  });

  it('renders Abrir Original button', () => {
    render(<DocumentoPreview documento={PDF_DOC} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Abrir Original')).toBeInTheDocument();
  });

  it('renders iframe for PDF document', () => {
    const { container } = render(
      <DocumentoPreview documento={PDF_DOC} isOpen={true} onClose={vi.fn()} />
    );
    expect(container.querySelector('iframe')).toBeInTheDocument();
  });

  it('renders img for image document', () => {
    const { container } = render(
      <DocumentoPreview documento={IMAGE_DOC} isOpen={true} onClose={vi.fn()} />
    );
    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('renders Visualização não disponível for unknown type', () => {
    render(<DocumentoPreview documento={UNKNOWN_DOC} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Visualização não disponível')).toBeInTheDocument();
  });

  it('renders Baixar para Ver button for unknown type', () => {
    render(<DocumentoPreview documento={UNKNOWN_DOC} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Baixar para Ver')).toBeInTheDocument();
  });

  it('renders document tipo in subtitle', () => {
    const { container } = render(
      <DocumentoPreview documento={PDF_DOC} isOpen={true} onClose={vi.fn()} />
    );
    expect(container.textContent).toMatch(/contrato/i);
  });
});
