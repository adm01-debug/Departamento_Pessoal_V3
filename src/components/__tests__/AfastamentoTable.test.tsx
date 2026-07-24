import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useAfastamentos', () => ({
  useAfastamentos: vi.fn(() => ({ excluir: vi.fn() })),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children }: any) => <div role="menuitem">{children}</div>,
}));

import { AfastamentoTable } from '../afastamentos/AfastamentoTable';

const MOCK_DATA = [
  {
    id: 'af-001-aaa',
    tipo: 'doenca',
    data_inicio: '2026-07-01',
    data_fim_prevista: '2026-07-15',
    dias_total: 15,
    dias_inss: 0,
    dias_empresa: 15,
    status: 'ativo',
    cid: null,
    protocolo_inss: null,
    documentos_count: 0,
    colaborador: { nome_completo: 'João Silva' },
  },
];

const DEFAULT_PROPS = {
  data: MOCK_DATA,
  onEdit: vi.fn(),
  onProrrogacao: vi.fn(),
  onDocuments: vi.fn(),
  onTimeline: vi.fn(),
};

describe('AfastamentoTable', () => {
  it('renders Colaborador table header', () => {
    render(<AfastamentoTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders Tipo / CID table header', () => {
    render(<AfastamentoTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('Tipo / CID')).toBeInTheDocument();
  });

  it('renders Período table header', () => {
    render(<AfastamentoTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('Período')).toBeInTheDocument();
  });

  it('renders Dias table header', () => {
    render(<AfastamentoTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('Dias')).toBeInTheDocument();
  });

  it('renders colaborador name in table row', () => {
    render(<AfastamentoTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders Doença tipo badge', () => {
    render(<AfastamentoTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('Doença')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<AfastamentoTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('ativo')).toBeInTheDocument();
  });

  it('renders action menu button', () => {
    render(<AfastamentoTable {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Mais opções/i })).toBeInTheDocument();
  });
});
