import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { maybeSingleMock, enviarLinkMock, toastMock, workflowMock } = vi.hoisted(() => ({
  maybeSingleMock: vi.fn(),
  enviarLinkMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
  workflowMock: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: toastMock }));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

vi.mock('@/integrations/supabase/client', () => {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gt', 'order', 'limit']) chain[m] = () => chain;
  chain.maybeSingle = maybeSingleMock;
  return { supabase: { from: () => chain } };
});

vi.mock('@/services/contratacaoService', () => ({
  contratacaoService: { enviarLinkCandidato: enviarLinkMock, transmitirESocial: vi.fn() },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  };
});

vi.mock('@/hooks/useContratacaoDigital', () => ({
  useContratacaoDigital: vi.fn(() => ({
    validarDocumento: { mutate: vi.fn(), isPending: false },
  })),
}));

vi.mock('@/hooks/useAdmissaoWorkflow', () => ({
  useAdmissaoWorkflow: workflowMock,
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('@/components/admissao/AdmissaoChecklist', () => ({
  AdmissaoChecklist: ({ documentos }: { documentos?: (v: unknown) => void }) => (
    <div data-testid="checklist">{documentos?.length} docs</div>
  ),
}));

vi.mock('@/utils/piiMask', () => ({
  maskCpfDisplay: vi.fn((cpf: string) => `***.***.${cpf?.slice(-5) || '***-**'}`),
  maskPisDisplay: vi.fn((v: string) => `***.${v?.slice(-5) || '***'}`),
  maskBankAccount: vi.fn((v: string) => `***${v?.slice(-4) || '***'}`),
  maskEmail: vi.fn((v: string) => `m***@***.${v?.split('.').pop() || '***'}`),
  maskGeneric: vi.fn((v: string) => `***${v?.slice(-4) || '***'}`),
  maskPiiDeep: vi.fn((v: unknown) => v),
}));

vi.mock('date-fns', () => ({ format: vi.fn(() => '24 de julho') }));
vi.mock('date-fns/locale', () => ({ ptBR: {} }));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    title,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: { children?: ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <button role="tab" data-value={value}>
      {children}
    </button>
  ),
}));

import { DetalhesAdmissaoDialog } from '../admissoes/DetalhesAdmissaoDialog';
import type { Tables } from '@/integrations/supabase/types';

const MOCK_ADMISSAO = {
  id: 'adm-1',
  nome: 'Fernanda Silva',
  cargo: 'Analista',
  departamento: 'RH',
  etapa: 'documentos',
  data_prevista: '2026-08-01',
  salario_proposto: 5000,
  cpf: '123.456.789-00',
  email: 'fernanda@test.com',
  created_at: '2026-07-01T00:00:00Z',
  checklist_documentos_pessoais: false,
  checklist_comprovante_endereco: false,
  checklist_ctps: false,
  checklist_exame_admissional: false,
  checklist_contrato_assinado: false,
} as unknown as Tables<'admissoes'>;

describe('DetalhesAdmissaoDialog', () => {
  beforeEach(() => {
    workflowMock.mockReturnValue({ workflow: null, isLoading: false, isError: false });
  });

  it('returns null when admissao is null', () => {
    const { container } = render(<DetalhesAdmissaoDialog admissao={null} open={true} onOpenChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders colaborador name in dialog title', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Fernanda Silva')).toBeInTheDocument();
  });

  it('renders etapa badge', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Docs Pendentes')).toBeInTheDocument();
  });

  it('renders cargo e departamento na descrição', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getAllByText('Analista').length).toBeGreaterThanOrEqual(1);
  });

  it('renders seção Dados da admissão', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Dados da admissão/i })).toBeInTheDocument();
  });

  it('renders seção Documentos', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Documentos/i })).toBeInTheDocument();
  });

  it('renders seção Histórico', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Histórico/i })).toBeInTheDocument();
  });

  it('copia o link do portal (sem abrir sessão do candidato) e gera token se não houver vigente', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    enviarLinkMock.mockResolvedValueOnce({ token: 'tok-novo' });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Copiar link do Portal/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/contratacao?token=tok-novo`));
    expect(enviarLinkMock).toHaveBeenCalledWith('adm-1', 'fernanda@test.com');
    expect(toastMock.success).toHaveBeenCalledWith('Link copiado — envie ao candidato');
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('desabilita o link do portal em admissão encerrada e não gera token', () => {
    enviarLinkMock.mockClear();
    const encerrada = { ...MOCK_ADMISSAO, etapa: 'concluida' } as Tables<'admissoes'>;
    render(<DetalhesAdmissaoDialog admissao={encerrada} open={true} onOpenChange={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /Copiar link do Portal/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/Admissão encerrada/));
    fireEvent.click(btn);
    expect(enviarLinkMock).not.toHaveBeenCalled();
  });

  it('não afirma histórico vazio enquanto a consulta do workflow carrega', () => {
    workflowMock.mockReturnValue({ workflow: null, isLoading: true, isError: false });
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.queryByText(/Nenhum evento registrado/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Carregando histórico/i)).toBeInTheDocument();
  });

  it('não afirma histórico vazio quando a consulta do workflow falha', () => {
    workflowMock.mockReturnValue({ workflow: null, isLoading: false, isError: true });
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.queryByText(/Nenhum evento registrado/i)).not.toBeInTheDocument();
    expect(screen.getByText(/NÃO significa que não houve evento/i)).toBeInTheDocument();
  });

  it('afirma histórico vazio só quando a consulta terminou sem erro', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Nenhum evento registrado/i)).toBeInTheDocument();
  });
});
