import type { ReactNode } from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DocumentoListItem } from '@/services/documentoService';

const state = vi.hoisted(() => ({
  docs: [] as DocumentoListItem[],
  docsLoading: false,
  assinaturas: [] as Array<{ conteudo_url?: string | null }>,
  signRows: [] as unknown[],
  invalidateQueries: vi.fn(),
  mutations: [] as Array<{
    mutationFn: (vars: never) => Promise<unknown>;
    onSuccess?: (data: unknown, vars: unknown, ctx: unknown) => unknown;
    onError?: (err: unknown, vars: unknown, ctx: unknown) => unknown;
  }>,
  storage: {
    upload: vi.fn(async (): Promise<{ error: { message: string } | null }> => ({ error: null })),
    createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://example.com/file' } })),
    download: vi.fn(async (): Promise<{ data: Blob | null; error: { message: string } | null }> => ({
      data: new Blob(['x']),
      error: null,
    })),
    remove: vi.fn(async (): Promise<{ error: { message: string } | null }> => ({ error: null })),
  },
  fromInsert: vi.fn(async (): Promise<{ error: { message: string } | null }> => ({ error: null })),
  selectValue: null as ((v: string) => void) | null,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((opts: { queryKey: unknown[]; queryFn: () => Promise<unknown> }) => {
    const key = opts.queryKey[0];
    if (key === 'portal-documentos') return { data: state.docs, isLoading: state.docsLoading };
    return { data: state.assinaturas, isLoading: false };
  }),
  useMutation: vi.fn((opts: (typeof state.mutations)[number]) => {
    state.mutations.push(opts);
    return {
      isPending: false,
      mutate: (vars: unknown) => {
        Promise.resolve()
          .then(() => opts.mutationFn(vars as never))
          .then((data) => opts.onSuccess?.(data, vars, undefined))
          .catch((err) => opts.onError?.(err, vars, undefined));
      },
    };
  }),
  useQueryClient: vi.fn(() => ({ invalidateQueries: state.invalidateQueries })),
}));

vi.mock('@/services', () => ({
  documentoService: {
    listarDocumentos: vi.fn(),
    criar: vi.fn(async () => ({})),
    excluir: vi.fn(async () => undefined),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: { from: vi.fn(() => state.storage) },
    from: vi.fn(() => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        limit: () => Promise.resolve({ data: state.signRows, error: null }),
        insert: state.fromInsert,
        update: () => builder,
      };
      return builder;
    }),
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children?: ReactNode; onValueChange?: (v: string) => void }) => {
    state.selectValue = onValueChange ?? null;
    return <div>{children}</div>;
  },
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button type="button">{children}</button>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <button type="button" onClick={() => state.selectValue?.(value ?? '')}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/signature/SignatureCanvas', () => ({
  SignatureCanvas: ({ onSave, onCancel }: { onSave: (b64: string) => void; onCancel: () => void }) => (
    <div data-testid="signature-canvas">
      <button type="button" onClick={() => onSave('data:image/png;base64,QUJD')}>
        mock-salvar-assinatura
      </button>
      <button type="button" onClick={onCancel}>
        mock-cancelar-assinatura
      </button>
    </div>
  ),
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: unknown, d: string) => d),
}));

import { documentoService } from '@/services';
import { toast } from 'sonner';
import { PortalDocumentosTab } from '../portal/PortalDocumentosTab';

const DOC_CONTRATO: DocumentoListItem = {
  id: 'd1',
  nome: 'Contrato de Trabalho.pdf',
  tipo: 'Contrato',
  url: 'https://storage/documentos/emp-1/contrato.pdf',
  created_at: '2024-06-01T10:00:00Z',
  storage_path: 'emp-1/contrato.pdf',
};

const MOCK_DOCS: DocumentoListItem[] = [
  DOC_CONTRATO,
  {
    id: 'd2',
    nome: 'RG.pdf',
    tipo: 'RG',
    url: 'https://storage/documentos/emp-1/rg.pdf',
    created_at: '2024-05-15T08:00:00Z',
    storage_path: 'emp-1/rg.pdf',
  },
];

function renderTab(colaboradorId = 'col-1', empresaId = 'emp-1') {
  return render(<PortalDocumentosTab navigate={vi.fn()} colaboradorId={colaboradorId} empresaId={empresaId} />);
}

describe('PortalDocumentosTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.docs = [];
    state.docsLoading = false;
    state.assinaturas = [];
    state.signRows = [];
    state.mutations.length = 0;
    state.selectValue = null;
    state.storage.upload.mockResolvedValue({ error: null });
    state.storage.download.mockResolvedValue({ data: new Blob(['x']), error: null });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('renders Gestão de Documentos title', () => {
    renderTab();
    expect(screen.getByText('Gestão de Documentos')).toBeInTheDocument();
  });

  it('renders Enviar Novo button', () => {
    renderTab();
    expect(screen.getByText('Enviar Novo')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    state.docsLoading = true;
    const { container } = renderTab();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    renderTab();
    expect(screen.getByText('Você ainda não enviou nenhum documento.')).toBeInTheDocument();
  });

  it('renders quick links', () => {
    renderTab();
    expect(screen.getByText('Documentos Pessoais')).toBeInTheDocument();
    expect(screen.getByText('Holerites')).toBeInTheDocument();
  });

  it('quick links chamam navigate com a rota', () => {
    const navigate = vi.fn();
    render(<PortalDocumentosTab navigate={navigate} colaboradorId="col-1" empresaId="emp-1" />);
    fireEvent.click(screen.getByText('Holerites'));
    expect(navigate).toHaveBeenCalledWith('/holerites');
    fireEvent.click(screen.getByText('Assinar Docs'));
    expect(navigate).toHaveBeenCalledWith('/assinaturas');
  });

  it('renders document names when data is loaded', () => {
    state.docs = MOCK_DOCS;
    renderTab();
    expect(screen.getByText('Contrato de Trabalho.pdf')).toBeInTheDocument();
    expect(screen.getByText('RG.pdf')).toBeInTheDocument();
  });

  it('renders document type badges', () => {
    state.docs = MOCK_DOCS;
    renderTab();
    expect(screen.getByText('Contrato')).toBeInTheDocument();
    expect(screen.getByText('RG')).toBeInTheDocument();
  });

  it('renders Meus Arquivos Recentes section title', () => {
    renderTab();
    expect(screen.getByText('Meus Arquivos Recentes')).toBeInTheDocument();
  });

  it('upload completo: tipo + arquivo → storage upload, signed URL e criar', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /Enviar Novo/i }));
    const dialog = await screen.findByRole('dialog');

    const enviarBtn = screen.getByRole('button', { name: /Enviar Documento/i });
    expect(enviarBtn).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'RG' }));
    const fileInput = dialog.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, {
      target: { files: [new File(['conteudo'], 'identidade.pdf', { type: 'application/pdf' })] },
    });
    expect(enviarBtn).toBeEnabled();
    fireEvent.click(enviarBtn);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Documento enviado com sucesso'));
    expect(state.storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^emp-1\/col-1\/.+\.pdf$/),
      expect.any(File)
    );
    expect(state.storage.createSignedUrl).toHaveBeenCalled();
    expect(documentoService.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'identidade.pdf',
        tipo: 'RG',
        url: 'https://example.com/file',
        colaborador_id: 'col-1',
        empresa_id: 'emp-1',
      })
    );
    expect(state.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['portal-documentos'] });
    expect(state.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['documentos'] });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('arquivo com extensão perigosa é rejeitado antes do upload', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /Enviar Novo/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Outro' }));
    fireEvent.change(dialog.querySelector('input[type="file"]')!, {
      target: { files: [new File(['x'], 'script.exe', { type: 'application/pdf' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar Documento/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Arquivo inválido.'));
    expect(state.storage.upload).not.toHaveBeenCalled();
  });

  it('erro no storage.upload mostra toast.error', async () => {
    state.storage.upload.mockResolvedValue({ error: { message: 'quota' } });
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /Enviar Novo/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'CPF' }));
    fireEvent.change(dialog.querySelector('input[type="file"]')!, {
      target: { files: [new File(['x'], 'cpf.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar Documento/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao enviar documento.'));
    expect(documentoService.criar).not.toHaveBeenCalled();
  });

  it('excluir documento remove do storage e chama service.excluir', async () => {
    state.docs = [MOCK_DOCS[1]];
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Documento removido'));
    expect(state.storage.remove).toHaveBeenCalledWith(['emp-1/rg.pdf']);
    expect(documentoService.excluir).toHaveBeenCalledWith('d2', 'emp-1');
    expect(state.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['portal-documentos'] });
  });

  it('baixar documento faz download do storage e dispara o anchor', async () => {
    state.docs = [MOCK_DOCS[1]];
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Baixar' }));
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled());
    expect(state.storage.download).toHaveBeenCalledWith('emp-1/rg.pdf');
  });

  it('erro no download mostra toast.error', async () => {
    state.storage.download.mockResolvedValue({ data: null, error: { message: 'nope' } });
    state.docs = [MOCK_DOCS[1]];
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Baixar' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao baixar arquivo'));
  });

  it('contrato não assinado mostra botão Assinar e registra a assinatura', async () => {
    state.docs = [DOC_CONTRATO];
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Assinar' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Assinatura de Documento');

    fireEvent.click(screen.getByRole('button', { name: 'mock-salvar-assinatura' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Documento assinado com sucesso!'));
    expect(state.storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^emp-1\/col-1\/assinaturas\/doc_d1_\d+\.png$/),
      expect.any(Uint8Array),
      { contentType: 'image/png' }
    );
    expect(state.fromInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Contrato de Trabalho.pdf',
        tipo_documento: 'Contrato',
        status: 'assinado',
        colaborador_id: 'col-1',
        empresa_id: 'emp-1',
        conteudo_url: DOC_CONTRATO.url,
      })
    );
    expect(state.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['portal-assinaturas'] });
  });

  it('contrato já assinado (ledger) esconde o botão Assinar', () => {
    state.docs = [DOC_CONTRATO];
    state.assinaturas = [{ conteudo_url: DOC_CONTRATO.url }];
    renderTab();
    expect(screen.queryByRole('button', { name: 'Assinar' })).not.toBeInTheDocument();
  });

  it('ledger já contém a assinatura: avisa e não insere duplicado', async () => {
    state.docs = [DOC_CONTRATO];
    state.signRows = [{ id: 'sig-1' }];
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Assinar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'mock-salvar-assinatura' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Documento já assinado anteriormente.'));
    expect(state.fromInsert).not.toHaveBeenCalled();
  });

  it('erro ao gravar assinatura mostra toast.error', async () => {
    state.fromInsert.mockResolvedValueOnce({ error: { message: 'insert fail' } });
    state.docs = [DOC_CONTRATO];
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Assinar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'mock-salvar-assinatura' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao assinar documento.'));
  });

  it('cancelar a assinatura fecha o diálogo sem gravar', async () => {
    state.docs = [DOC_CONTRATO];
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Assinar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'mock-cancelar-assinatura' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(state.fromInsert).not.toHaveBeenCalled();
  });
});
