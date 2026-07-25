import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useContratacaoDigital', () => ({
  useContratacaoDigital: vi.fn(() => ({
    validarDocumento: { mutate: vi.fn(), isPending: false },
  })),
}));

vi.mock('@/hooks/useAdmissaoWorkflow', () => ({
  useAdmissaoWorkflow: vi.fn(() => ({ workflow: [] })),
}));

vi.mock('@/hooks/useESocial', () => ({
  useESocial: vi.fn(() => ({ enviarEvento: vi.fn() })),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('@/components/admissao/AdmissaoChecklist', () => ({
  AdmissaoChecklist: ({ documentos }: any) => (
    <div data-testid="checklist">{documentos?.length} docs</div>
  ),
}));

vi.mock('@/utils/piiMask', () => ({
  maskCpfDisplay: vi.fn((cpf: string) => `***.***.${cpf?.slice(-5) || '***-**'}`),
}));

vi.mock('date-fns', () => ({ format: vi.fn(() => '24 de julho') }));
vi.mock('date-fns/locale', () => ({ ptBR: {} }));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  TabsList: ({ children }: any) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button role="tab" data-value={value}>{children}</button>,
}));

import { DetalhesAdmissaoDialog } from '../admissoes/DetalhesAdmissaoDialog';

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
};

describe('DetalhesAdmissaoDialog', () => {
  it('returns null when admissao is null', () => {
    const { container } = render(
      <DetalhesAdmissaoDialog admissao={null} open={true} onOpenChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders colaborador name in dialog title', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Fernanda Silva')).toBeInTheDocument();
  });

  it('renders etapa badge', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('documentos')).toBeInTheDocument();
  });

  it('renders Gerenciamento de admissão digital description', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Gerenciamento de admissão digital/i)).toBeInTheDocument();
  });

  it('renders Geral tab', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Geral/i })).toBeInTheDocument();
  });

  it('renders Documentos tab', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Documentos/i })).toBeInTheDocument();
  });

  it('renders Histórico tab', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Histórico/i })).toBeInTheDocument();
  });

  it('renders Ver Portal button', () => {
    render(<DetalhesAdmissaoDialog admissao={MOCK_ADMISSAO} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Ver Portal/i)).toBeInTheDocument();
  });
});
