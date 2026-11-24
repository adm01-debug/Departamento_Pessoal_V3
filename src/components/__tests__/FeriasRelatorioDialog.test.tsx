import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001', nome: 'Empresa Teste' } })),
}));

vi.mock('@/utils/feriasPDF', () => ({
  feriasPDF: { gerarRelatorioKPIs: vi.fn().mockResolvedValue(undefined) },
}));

import { FeriasRelatorioDialog } from '../ferias/FeriasRelatorioDialog';

const MOCK_STATS = {
  total: 10,
  aprovadas: 5,
  pendentes: 3,
  vencidas: 2,
};

const MOCK_DATA = [
  {
    id: 'fer-001',
    data_inicio: '2026-06-01',
    data_fim: '2026-06-30',
    status: 'aprovada',
    colaborador: { nome_completo: 'João Silva' },
  },
  {
    id: 'fer-002',
    data_inicio: '2026-05-01',
    data_fim: '2026-05-20',
    status: 'pendente',
    colaborador: { nome_completo: 'Maria Souza' },
  },
];

describe('FeriasRelatorioDialog', () => {
  it('renders Relatório PDF trigger button', () => {
    render(<FeriasRelatorioDialog stats={MOCK_STATS} data={[]} />);
    expect(screen.getByRole('button', { name: /Relat.*rio PDF/i })).toBeInTheDocument();
  });

  it('renders Gerar Relatório de Férias dialog title', () => {
    render(<FeriasRelatorioDialog stats={MOCK_STATS} data={[]} />);
    expect(screen.getByText(/Gerar Relat.*rio de F.*rias/i)).toBeInTheDocument();
  });

  it('renders Selecione o Período label', () => {
    render(<FeriasRelatorioDialog stats={MOCK_STATS} data={[]} />);
    expect(screen.getByText('Selecione o Período')).toBeInTheDocument();
  });

  it('renders Últimos 6 meses period option', () => {
    render(<FeriasRelatorioDialog stats={MOCK_STATS} data={[]} />);
    expect(screen.getByText('Últimos 6 meses')).toBeInTheDocument();
  });

  it('renders Ano Atual period option', () => {
    render(<FeriasRelatorioDialog stats={MOCK_STATS} data={[]} />);
    expect(screen.getByText(/Ano Atual/i)).toBeInTheDocument();
  });

  it('renders Download PDF button', () => {
    render(<FeriasRelatorioDialog stats={MOCK_STATS} data={[]} />);
    expect(screen.getByRole('button', { name: /Download PDF/i })).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<FeriasRelatorioDialog stats={MOCK_STATS} data={[]} />);
    expect(screen.getByText(/Nenhum registro encontrado para este per.*odo/i)).toBeInTheDocument();
  });

  it('renders colaborador name from data when provided', () => {
    render(<FeriasRelatorioDialog stats={MOCK_STATS} data={MOCK_DATA} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });
});
