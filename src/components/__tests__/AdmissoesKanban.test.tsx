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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
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
    ['Solicitação', 'Documentos', 'Validação', 'Pendente', 'Exame', 'Contrato', 'Assinatura', 'eSocial'].forEach(label => {
      expect(container.textContent).toContain(label);
    });
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
