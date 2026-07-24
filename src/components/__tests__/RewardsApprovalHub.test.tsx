import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/hooks', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@/services/premiacoesService', () => ({
  premiacoesService: {
    atualizarStatusPagamento: vi.fn().mockResolvedValue({}),
    reconciliarPagamento: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any) => String(e)),
}));

import { RewardsApprovalHub } from '../premiacoes/RewardsApprovalHub';

const MOCK_PAGAMENTOS = [
  {
    id: 'pag-001',
    status: 'calculado',
    valor_calculado: 1000,
    valor_aprovado: 1000,
    colaborador: { nome_completo: 'João Silva' },
  },
  {
    id: 'pag-002',
    status: 'aprovado_gestor',
    valor_calculado: 2000,
    valor_aprovado: 2000,
    colaborador: { nome_completo: 'Maria Souza' },
  },
];

describe('RewardsApprovalHub', () => {
  it('renders Aguardando Gestor stage', () => {
    render(<RewardsApprovalHub pagamentos={[]} />);
    expect(screen.getByText('Aguardando Gestor')).toBeInTheDocument();
  });

  it('renders Em Revisão stage', () => {
    render(<RewardsApprovalHub pagamentos={[]} />);
    expect(screen.getByText('Em Revisão')).toBeInTheDocument();
  });

  it('renders Aguardando RH stage', () => {
    render(<RewardsApprovalHub pagamentos={[]} />);
    expect(screen.getByText('Aguardando RH')).toBeInTheDocument();
  });

  it('renders Aguardando Financeiro stage', () => {
    render(<RewardsApprovalHub pagamentos={[]} />);
    expect(screen.getByText('Aguardando Financeiro')).toBeInTheDocument();
  });

  it('renders Conciliação stage', () => {
    render(<RewardsApprovalHub pagamentos={[]} />);
    expect(screen.getAllByText(/Concilia.*o/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders colaborador name in calculado stage', () => {
    render(<RewardsApprovalHub pagamentos={MOCK_PAGAMENTOS} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders colaborador name in aprovado_gestor stage', () => {
    render(<RewardsApprovalHub pagamentos={MOCK_PAGAMENTOS} />);
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
  });

  it('renders 5 stage columns', () => {
    const { container } = render(<RewardsApprovalHub pagamentos={[]} />);
    const cards = container.querySelectorAll('[class*="rounded-2xl"]');
    expect(cards.length).toBeGreaterThanOrEqual(5);
  });
});
