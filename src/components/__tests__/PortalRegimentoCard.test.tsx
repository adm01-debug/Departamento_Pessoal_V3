import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-123' } })),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html, addHook: vi.fn(), removeHooks: vi.fn() },
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input type="checkbox" checked={checked} onChange={e => onCheckedChange(e.target.checked)} />
  ),
}));

// Mutable call tracking for maybySingle responses
let maybeResponses: any[] = [];
let callIdx = 0;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve(maybeResponses[callIdx++] ?? { data: null, error: null })),
    })),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}));

import { PortalRegimentoCard } from '../portal/PortalRegimentoCard';

beforeEach(() => {
  callIdx = 0;
  maybeResponses = [];
});

describe('PortalRegimentoCard', () => {
  it('shows no-document message when no regimento published', async () => {
    // All calls return null: colaborador=null, documento=null
    maybeResponses = [
      { data: { id: 'col-1' }, error: null }, // colaboradores
      { data: null, error: null },              // sst_regimento_documentos → null
    ];
    render(<PortalRegimentoCard />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum regimento publicado/)).toBeInTheDocument();
    });
  });

  it('shows Regimento Interno de SST title in no-document state', async () => {
    maybeResponses = [
      { data: { id: 'col-1' }, error: null },
      { data: null, error: null },
    ];
    render(<PortalRegimentoCard />);
    await waitFor(() => {
      expect(screen.getAllByText(/Regimento Interno de SST/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows no-vinculo message when no colaborador linked', async () => {
    maybeResponses = [
      { data: null, error: null }, // colaboradores → null (no link)
      { data: { id: 'doc-1', titulo: 'Regimento SST', versao: 1, conteudo_html: '', hash_sha256: null, publicado_em: null }, error: null }, // document exists but no cid
    ];
    render(<PortalRegimentoCard />);
    await waitFor(() => {
      expect(screen.getByText(/não está vinculado/)).toBeInTheDocument();
    });
  });

  it('renders document title and version when document is available', async () => {
    maybeResponses = [
      { data: { id: 'col-1' }, error: null },
      { data: { id: 'doc-1', titulo: 'Regimento SST 2024', versao: 2, conteudo_html: '<p>Conteudo</p>', hash_sha256: null, publicado_em: '2024-01-01T00:00:00Z' }, error: null },
      { data: null, error: null }, // assinatura → not signed
    ];
    render(<PortalRegimentoCard />);
    await waitFor(() => {
      expect(screen.getByText('Regimento SST 2024')).toBeInTheDocument();
    });
  });

  it('renders Versão badge for documents', async () => {
    maybeResponses = [
      { data: { id: 'col-1' }, error: null },
      { data: { id: 'doc-1', titulo: 'Regimento SST 2024', versao: 2, conteudo_html: '<p>Conteudo</p>', hash_sha256: null, publicado_em: '2024-01-01T00:00:00Z' }, error: null },
      { data: null, error: null },
    ];
    render(<PortalRegimentoCard />);
    await waitFor(() => {
      expect(screen.getByText('Versão 2')).toBeInTheDocument();
    });
  });

  it('shows sign button when document not signed', async () => {
    maybeResponses = [
      { data: { id: 'col-1' }, error: null },
      { data: { id: 'doc-1', titulo: 'Regimento SST', versao: 1, conteudo_html: '<p>Text</p>', hash_sha256: null, publicado_em: null }, error: null },
      { data: null, error: null }, // not signed
    ];
    render(<PortalRegimentoCard />);
    await waitFor(() => {
      expect(screen.getByText('Assinar digitalmente')).toBeInTheDocument();
    });
  });

  it('shows Assinado badge when already signed', async () => {
    maybeResponses = [
      { data: { id: 'col-1' }, error: null },
      { data: { id: 'doc-1', titulo: 'Regimento SST', versao: 1, conteudo_html: '<p>Text</p>', hash_sha256: null, publicado_em: null }, error: null },
      { data: { documento_id: 'doc-1', assinado_em: '2024-06-01T10:00:00Z', hash_documento: null }, error: null },
    ];
    render(<PortalRegimentoCard />);
    await waitFor(() => {
      expect(screen.getByText('Assinado')).toBeInTheDocument();
    });
  });
});
