import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useTabelasReferencia', () => ({
  useContasBancarias: vi.fn(),
  useCriarContaBancaria: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExcluirContaBancaria: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => children,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { children?: ReactNode; placeholder?: string }) => <span>{placeholder || ''}</span>,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

import { useContasBancarias } from '@/hooks/useTabelasReferencia';
import { ContasBancariasTab } from '../colaborador-detalhes/ContasBancariasTab';
import { maskBankAccount, maskCpfDisplay } from '@/utils/piiMask';

const MOCK_CONTAS = [
  {
    id: 'c1',
    banco_nome: 'Banco do Brasil',
    banco_codigo: '001',
    agencia: '1234',
    conta: '56789-0',
    tipo_conta: 'Corrente',
    pix_tipo: 'CPF',
    pix_chave: '123.456.789-00',
    principal: true,
  },
];

describe('ContasBancariasTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: undefined, isLoading: true } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Contas Bancárias title', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: [], isLoading: false } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByText('Contas Bancárias')).toBeInTheDocument();
  });

  it('renders Adicionar button', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: [], isLoading: false } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: [], isLoading: false } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhuma conta cadastrada.')).toBeInTheDocument();
  });

  it('renders banco_nome with codigo', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByText(/Banco do Brasil/)).toBeInTheDocument();
    expect(screen.getByText(/001/)).toBeInTheDocument();
  });

  it('renders agencia and conta mascaradas (LGPD)', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    // Dados bancários nunca são exibidos em claro: apenas os 4 últimos dígitos.
    expect(screen.getByText(maskBankAccount('1234'))).toBeInTheDocument();
    expect(screen.getByText(maskBankAccount('56789-0'))).toBeInTheDocument();
    expect(screen.queryByText('56789-0')).not.toBeInTheDocument();
  });

  it('renders pix info mascarada para papel sem PII (LGPD)', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    // Chave PIX tipo CPF é PII: sem papel admin/moderator renderiza mascarada.
    expect(screen.getByText(`CPF: ${maskCpfDisplay('123.456.789-00')}`)).toBeInTheDocument();
    expect(screen.queryByText(/123\.456\.789-00/)).not.toBeInTheDocument();
  });

  it('renders principal badge', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Sim').length).toBeGreaterThanOrEqual(1);
  });
});
