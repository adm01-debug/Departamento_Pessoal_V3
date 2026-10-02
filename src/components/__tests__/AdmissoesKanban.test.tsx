import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  DragOverlay: ({ children }: any) => <div>{children}</div>,
  DragStartEvent: {},
  DragEndEvent: {},
  PointerSensor: class {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn((...s: any[]) => s),
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
  useDraggable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  })),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// O board monta a Nova Admissão sob demanda ("+ Adicionar candidato"); o duble
// evita puxar o formulário (e o hook de admissões) para dentro deste teste.
vi.mock('@/components/admissoes/NovaAdmissaoDialog', () => ({
  NovaAdmissaoDialog: ({ open }: any) => (open ? <div data-testid="nova-admissao" /> : null),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@/utils/format', () => ({
  formatDate: vi.fn((d: string) => d),
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any) => String(e)),
}));

vi.mock('@/services/admissaoService', () => ({
  admissaoService: { atualizar: vi.fn().mockResolvedValue({}) },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { AdmissoesKanban } from '../admissoes/AdmissoesKanban';

const MOCK_ADMISSOES = [
  {
    id: 'adm-001',
    nome: 'Carlos Ferreira',
    cargo: 'Engenheiro de Software',
    departamento: 'TI',
    etapa: 'solicitacao',
    data_prevista: '2026-08-01',
    salario_proposto: 8000,
  },
  {
    id: 'adm-002',
    nome: 'Ana Lima',
    cargo: 'Designer',
    departamento: 'Marketing',
    etapa: 'documentos',
    data_prevista: null,
    salario_proposto: null,
  },
];

describe('AdmissoesKanban', () => {
  it('renders Solicitação column label', () => {
    render(<AdmissoesKanban admissoes={[]} />);
    expect(screen.getByText('Solicitação')).toBeInTheDocument();
  });

  it('renders Documentos column label', () => {
    render(<AdmissoesKanban admissoes={[]} />);
    expect(screen.getByText('Documentos')).toBeInTheDocument();
  });

  it('renders eSocial column label', () => {
    render(<AdmissoesKanban admissoes={[]} />);
    expect(screen.getByText('eSocial')).toBeInTheDocument();
  });

  it('renders all 8 column labels', () => {
    const { container } = render(<AdmissoesKanban admissoes={[]} />);
    ['Solicitação', 'Documentos', 'Validação', 'Pendente', 'Exame', 'Contrato', 'Assinatura', 'eSocial'].forEach(
      (label) => {
        expect(container.textContent).toContain(label);
      }
    );
  });

  it('renders Solte aqui empty placeholder', () => {
    render(<AdmissoesKanban admissoes={[]} />);
    const placeholders = screen.getAllByText('Solte aqui');
    expect(placeholders.length).toBeGreaterThanOrEqual(1);
  });

  it('renders admissao name in correct column', () => {
    render(<AdmissoesKanban admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('Carlos Ferreira')).toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
  });

  it('renders cargo text', () => {
    render(<AdmissoesKanban admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('Engenheiro de Software')).toBeInTheDocument();
  });

  it('renders departamento badge', () => {
    render(<AdmissoesKanban admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('TI')).toBeInTheDocument();
  });
});

/**
 * Fixtures do REDESIGN: cada card exercita um caminho da linha de status, que é
 * derivada de dado real (checklist, pendência, recibo do eSocial) — não de texto
 * fixo por etapa.
 */
const COM_CONTEXTO = {
  documentos: {
    id: 'k-doc',
    nome: 'Carlos Ferreira',
    cargo: 'Engenheiro de Software',
    departamento: 'TI',
    etapa: 'documentos',
    data_prevista: '2026-08-01',
    metadata: { responsavel: 'Bruno Cardoso', pendencia: null },
    checklist_documentos_pessoais: true,
    checklist_comprovante_endereco: true,
    checklist_foto: true,
    checklist_ctps: false,
    checklist_exame_admissional: false,
    checklist_contrato_assinado: false,
  },
  exame: {
    id: 'k-exa',
    nome: 'Ana Lima',
    etapa: 'exame',
    checklist_exame_admissional: true,
  },
  pendente: { id: 'k-pen', nome: 'João Souza', etapa: 'pendente' },
  esocial: { id: 'k-eso', nome: 'Maria Reis', etapa: 'esocial', status_esocial: 'enviado' },
  concluida: { id: 'k-con', nome: 'Rita Alves', etapa: 'concluida' },
  cancelada: { id: 'k-can', nome: 'Paulo Dias', etapa: 'cancelada' },
};

describe('AdmissoesKanban — colunas e cards do redesign', () => {
  it('mostra a descrição da função de cada etapa principal no cabeçalho', () => {
    const { container } = render(<AdmissoesKanban admissoes={[]} />);
    [
      'Aguardando aprovação da vaga',
      'Coleta e conferência de documentos',
      'Análise e validação das informações',
      'Exames médicos e complementares',
      'Elaboração e assinatura',
    ].forEach((descricao) => expect(container.textContent).toContain(descricao));
  });

  it('não usa mais o título da coluna em caixa alta', () => {
    render(<AdmissoesKanban admissoes={[]} />);
    expect(screen.getByText('Solicitação')).not.toHaveClass('uppercase');
  });

  it('oferece "+ Adicionar candidato" no rodapé de todas as colunas', () => {
    render(<AdmissoesKanban admissoes={MOCK_ADMISSOES} />);
    // Uma por coluna: as 8 do fluxo + as 2 terminais (concluída/cancelada).
    expect(screen.getAllByText('Adicionar candidato')).toHaveLength(10);
  });

  it('mostra avatar de iniciais, responsável e prazo no card', () => {
    render(<AdmissoesKanban admissoes={[COM_CONTEXTO.documentos]} />);
    expect(screen.getByText('CF')).toBeInTheDocument(); // iniciais do candidato
    expect(screen.getByText('BC')).toBeInTheDocument(); // iniciais do responsável
    expect(screen.getByText('Bruno Cardoso')).toBeInTheDocument();
    expect(screen.getByText('2026-08-01')).toBeInTheDocument(); // formatDate dublado
  });

  it('deriva o status contextual do dado real da etapa', () => {
    render(
      <AdmissoesKanban
        admissoes={[COM_CONTEXTO.documentos, COM_CONTEXTO.exame, COM_CONTEXTO.pendente, COM_CONTEXTO.esocial]}
      />
    );
    expect(screen.getByText('3/6 documentos')).toBeInTheDocument(); // 3 dos 6 do checklist
    expect(screen.getByText('Exame realizado')).toBeInTheDocument(); // ASO marcado
    expect(screen.getByText('Etapa travada por pendência')).toBeInTheDocument();
    expect(screen.getByText('Transmitido ao eSocial')).toBeInTheDocument(); // recibo
  });

  it('usa o texto da pendência registrada quando ela existe', () => {
    render(
      <AdmissoesKanban
        admissoes={[{ ...COM_CONTEXTO.pendente, metadata: { responsavel: 'Ana Lima', pendencia: 'CPF divergente' } }]}
      />
    );
    expect(screen.getByText('CPF divergente')).toBeInTheDocument();
  });

  it('não perde admissão concluída nem cancelada (colunas terminais)', () => {
    render(<AdmissoesKanban admissoes={[COM_CONTEXTO.concluida, COM_CONTEXTO.cancelada]} />);
    expect(screen.getByText('Processo concluído')).toBeInTheDocument();
    expect(screen.getByText('Processo cancelado')).toBeInTheDocument();
  });

  it('mantém o menu de ações acessível em cada card', () => {
    render(<AdmissoesKanban admissoes={[MOCK_ADMISSOES[0]]} />);
    expect(screen.getByLabelText('Mais ações de Carlos Ferreira')).toBeInTheDocument();
  });
});
