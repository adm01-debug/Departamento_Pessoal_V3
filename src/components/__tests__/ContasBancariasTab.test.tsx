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
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder || ''}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

import { useContasBancarias } from '@/hooks/useTabelasReferencia';
import { ContasBancariasTab } from '../colaborador-detalhes/ContasBancariasTab';

const MOCK_CONTAS = [
  { id: 'c1', banco_nome: 'Banco do Brasil', banco_codigo: '001', agencia: '1234', conta: '56789-0', tipo_conta: 'Corrente', pix_tipo: 'CPF', pix_chave: '123.456.789-00', principal: true },
];

describe('ContasBancariasTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Contas Bancárias title', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: [], isLoading: false } as any);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByText('Contas Bancárias')).toBeInTheDocument();
  });

  it('renders Adicionar button', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: [], isLoading: false } as any);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: [], isLoading: false } as any);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhuma conta cadastrada.')).toBeInTheDocument();
  });

  it('renders banco_nome with codigo', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as any);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByText(/Banco do Brasil/)).toBeInTheDocument();
    expect(screen.getByText(/001/)).toBeInTheDocument();
  });

  it('renders agencia and conta', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as any);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(screen.getByText('56789-0')).toBeInTheDocument();
  });

  it('renders pix info', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as any);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByText(/CPF: 123\.456/)).toBeInTheDocument();
  });

  it('renders principal badge', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as any);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Sim').length).toBeGreaterThanOrEqual(1);
  });
});
