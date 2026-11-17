import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/hooks/useTabelasReferencia', () => ({
  useContasBancarias: vi.fn(),
  useCriarContaBancaria: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useAtualizarContaBancaria: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExcluirContaBancaria: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/dialog', () => ({
  // O componente controla o diálogo por `onOpenChange` (é ele que limpa o
  // modo edição ao fechar), então o mock precisa oferecer esse caminho.
  Dialog: ({ children, onOpenChange }: { children?: ReactNode; onOpenChange?: (aberto: boolean) => void }) => (
    <div>
      <button aria-label="fechar-dialogo" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => children,
}));

// `usePiiMask` real devolve `canViewPii: false` sem AuthContext — os casos de
// edição precisam do papel que VÊ o dado bancário (admin/rh), e um caso
// precisa do contrário, para provar que sem permissão não se edita.
let podeVerPii = false;
vi.mock('@/hooks/usePiiMask', () => ({
  usePiiMask: () => ({
    canViewPii: podeVerPii,
    bankAccount: (v?: string | null) => (podeVerPii ? (v ?? '') : maskBankAccount(v)),
    pix: (tipo?: string | null, chave?: string | null) =>
      podeVerPii ? (chave ?? '') : (tipo ?? '').toLowerCase() === 'cpf' ? maskCpfDisplay(chave) : '***',
  }),
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

import { useAtualizarContaBancaria, useContasBancarias, useCriarContaBancaria } from '@/hooks/useTabelasReferencia';
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
    // Chave PIX tipo CPF é PII: sem papel admin/rh renderiza mascarada.
    expect(screen.getByText(`CPF: ${maskCpfDisplay('123.456.789-00')}`)).toBeInTheDocument();
    expect(screen.queryByText(/123\.456\.789-00/)).not.toBeInTheDocument();
  });

  it('renders principal badge', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Sim').length).toBeGreaterThanOrEqual(1);
  });
});

describe('ContasBancariasTab — edição', () => {
  beforeEach(() => {
    podeVerPii = true;
  });
  afterEach(() => {
    podeVerPii = false;
  });

  it('não deixa editar quem não pode ver o dado bancário', () => {
    podeVerPii = false;
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);

    // A tabela mostra mascarado; o formulário de edição mostraria o real.
    expect(screen.getByText(maskBankAccount('56789-0'))).toBeInTheDocument();
    expect(screen.getByLabelText('Editar conta')).toBeDisabled();
  });

  it('abre o diálogo em modo edição com os valores REAIS da conta', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);

    fireEvent.click(screen.getByLabelText('Editar conta'));

    expect(screen.getByText('Editar Conta Bancária')).toBeInTheDocument();
    expect((screen.getByDisplayValue('56789-0') as HTMLInputElement).value).toBe('56789-0');
    expect(screen.getByDisplayValue('1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Banco do Brasil')).toBeInTheDocument();
  });

  it('grava pelo hook de atualizar, com o id da conta', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAtualizarContaBancaria).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);

    fireEvent.click(screen.getByLabelText('Editar conta'));
    fireEvent.change(screen.getByDisplayValue('56789-0'), { target: { value: '99999-9' } });
    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      id: 'c1',
      dados: expect.objectContaining({ conta: '99999-9', agencia: '1234', principal: true }),
    });
    // Editar NUNCA chama o criar (criaria uma segunda conta).
    expect(vi.mocked(useCriarContaBancaria).mock.results[0]?.value.mutateAsync).not.toHaveBeenCalled();
  });

  it('o diálogo volta ao modo "nova" depois de fechar a edição', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as never);
    render(<ContasBancariasTab colaboradorId="col-1" />);

    fireEvent.click(screen.getByLabelText('Editar conta'));
    expect(screen.getByText('Editar Conta Bancária')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('fechar-dialogo'));
    expect(screen.getByText('Nova Conta Bancária')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('56789-0')).toBeNull();
  });
});
