import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
}));

// Mesma permissividade do mock de `dialog` acima (ignora `open`, sempre
// renderiza o conteúdo) — o botão "+ Adicionar" abre um `AnimatedCascadeDialog`
// (Radix real + framer-motion, sem mock próprio) em vez do `Dialog` mockado
// acima; sem isto, o formulário só apareceria no DOM depois de um clique real,
// quebrando os testes que preenchem os campos diretamente.
vi.mock('@/components/ui/animated-cascade-dialog', () => ({
  AnimatedCascadeDialog: ({ items }: any) => <div role="dialog">{items}</div>,
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

import { useContasBancarias, useCriarContaBancaria } from '@/hooks/useTabelasReferencia';
import { ContasBancariasTab } from '../colaborador-detalhes/ContasBancariasTab';
import { maskBankAccount, maskPixKey } from '@/utils/piiMask';

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

  it('renders agencia and conta mascaradas (LGPD)', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as any);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    // Dados bancários nunca são exibidos em claro: apenas os 4 últimos dígitos.
    expect(screen.getByText(maskBankAccount('1234'))).toBeInTheDocument();
    expect(screen.getByText(maskBankAccount('56789-0'))).toBeInTheDocument();
    expect(screen.queryByText('56789-0')).not.toBeInTheDocument();
  });

  it('renders pix info mascarada — chave Pix nunca aparece em texto claro (PARTE 4B)', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as any);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getByText(new RegExp(`CPF: ${maskPixKey(MOCK_CONTAS[0].pix_chave)}`))).toBeInTheDocument();
    expect(screen.queryByText(/123\.456\.789-00/)).not.toBeInTheDocument();
  });

  it('renders principal badge', () => {
    vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as any);
    render(<ContasBancariasTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Sim').length).toBeGreaterThanOrEqual(1);
  });

  describe('aviso de conta principal (PARTE 4B)', () => {
    it('não exibe alerta quando existe exatamente uma conta principal', () => {
      vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as any);
      render(<ContasBancariasTab colaboradorId="col-1" />);
      expect(screen.queryByText(/Nenhuma conta principal/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Mais de uma conta principal/)).not.toBeInTheDocument();
    });

    it('exibe alerta quando nenhuma conta é principal', () => {
      const contasSemPrincipal = [{ ...MOCK_CONTAS[0], principal: false }];
      vi.mocked(useContasBancarias).mockReturnValue({ data: contasSemPrincipal, isLoading: false } as any);
      render(<ContasBancariasTab colaboradorId="col-1" />);
      expect(screen.getByText(/Nenhuma conta principal definida/)).toBeInTheDocument();
    });

    it('exibe alerta quando existe mais de uma conta principal', () => {
      const duasPrincipais = [
        { ...MOCK_CONTAS[0], id: 'c1', principal: true },
        { ...MOCK_CONTAS[0], id: 'c2', principal: true },
      ];
      vi.mocked(useContasBancarias).mockReturnValue({ data: duasPrincipais, isLoading: false } as any);
      render(<ContasBancariasTab colaboradorId="col-1" />);
      expect(screen.getByText(/Mais de uma conta principal encontrada/)).toBeInTheDocument();
    });

    it('não exibe nenhum alerta de principal quando não há contas cadastradas', () => {
      vi.mocked(useContasBancarias).mockReturnValue({ data: [], isLoading: false } as any);
      render(<ContasBancariasTab colaboradorId="col-1" />);
      expect(screen.queryByText(/Nenhuma conta principal/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Mais de uma conta principal/)).not.toBeInTheDocument();
    });
  });

  describe('bloqueio de segunda conta principal no formulário (PARTE 4B)', () => {
    it('não chama criar.mutateAsync ao tentar marcar uma segunda conta como principal', async () => {
      const mutateAsync = vi.fn();
      vi.mocked(useCriarContaBancaria).mockReturnValue({ mutateAsync, isPending: false } as any);
      // já existe uma conta principal para este colaborador
      vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as any);
      render(<ContasBancariasTab colaboradorId="col-1" />);

      // PARTE 4E: ordem dos textboxes agora inclui os dígitos opcionais entre
      // agência/conta (banco_codigo, banco_nome, agencia, agencia_digito, conta, digito).
      const [, nomeBanco, agencia, , conta] = screen.getAllByRole('textbox');
      fireEvent.change(nomeBanco, { target: { value: 'Banco X' } });
      fireEvent.change(agencia, { target: { value: '0001' } });
      fireEvent.change(conta, { target: { value: '12345-6' } });
      // getAllByRole (não getByRole): o dialog de edição (sempre montado por
      // causa do mock permissivo de `Dialog`/`AnimatedCascadeDialog` acima)
      // também renderiza o checkbox "Conta principal" do seu próprio
      // formulário — o [0] é sempre o do formulário de CRIAÇÃO, que vem
      // primeiro na árvore.
      fireEvent.click(screen.getAllByRole('checkbox')[0]);

      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('permite criar uma conta não-principal mesmo já existindo uma principal', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ id: 'nova' });
      vi.mocked(useCriarContaBancaria).mockReturnValue({ mutateAsync, isPending: false } as any);
      vi.mocked(useContasBancarias).mockReturnValue({ data: MOCK_CONTAS, isLoading: false } as any);
      render(<ContasBancariasTab colaboradorId="col-1" />);

      // PARTE 4E: ordem dos textboxes agora inclui os dígitos opcionais entre
      // agência/conta (banco_codigo, banco_nome, agencia, agencia_digito, conta, digito).
      const [, nomeBanco, agencia, , conta] = screen.getAllByRole('textbox');
      fireEvent.change(nomeBanco, { target: { value: 'Banco X' } });
      fireEvent.change(agencia, { target: { value: '0001' } });
      fireEvent.change(conta, { target: { value: '12345-6' } });
      // checkbox "principal" NÃO marcado

      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(mutateAsync).toHaveBeenCalledTimes(1);
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ principal: false }));
    });

    it('permite criar a primeira conta principal quando nenhuma existe ainda', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ id: 'nova' });
      vi.mocked(useCriarContaBancaria).mockReturnValue({ mutateAsync, isPending: false } as any);
      vi.mocked(useContasBancarias).mockReturnValue({ data: [], isLoading: false } as any);
      render(<ContasBancariasTab colaboradorId="col-1" />);

      // PARTE 4E: ordem dos textboxes agora inclui os dígitos opcionais entre
      // agência/conta (banco_codigo, banco_nome, agencia, agencia_digito, conta, digito).
      const [, nomeBanco, agencia, , conta] = screen.getAllByRole('textbox');
      fireEvent.change(nomeBanco, { target: { value: 'Banco X' } });
      fireEvent.change(agencia, { target: { value: '0001' } });
      fireEvent.change(conta, { target: { value: '12345-6' } });
      // getAllByRole (não getByRole): o dialog de edição (sempre montado por
      // causa do mock permissivo de `Dialog`/`AnimatedCascadeDialog` acima)
      // também renderiza o checkbox "Conta principal" do seu próprio
      // formulário — o [0] é sempre o do formulário de CRIAÇÃO, que vem
      // primeiro na árvore.
      fireEvent.click(screen.getAllByRole('checkbox')[0]);

      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(mutateAsync).toHaveBeenCalledTimes(1);
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ principal: true }));
    });
  });

  describe('dígito da agência e da conta (PARTE 4E)', () => {
    it('permite informar e persiste agencia_digito e digito ao criar uma conta', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ id: 'nova' });
      vi.mocked(useCriarContaBancaria).mockReturnValue({ mutateAsync, isPending: false } as any);
      vi.mocked(useContasBancarias).mockReturnValue({ data: [], isLoading: false } as any);
      render(<ContasBancariasTab colaboradorId="col-1" />);

      const [, nomeBanco, agencia, agenciaDigito, conta, digito] = screen.getAllByRole('textbox');
      fireEvent.change(nomeBanco, { target: { value: 'Banco X' } });
      fireEvent.change(agencia, { target: { value: '0001' } });
      fireEvent.change(agenciaDigito, { target: { value: '2' } });
      fireEvent.change(conta, { target: { value: '12345' } });
      fireEvent.change(digito, { target: { value: '6' } });

      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ agencia_digito: '2', digito: '6' })
      );
    });

    it('são opcionais — criar sem preenchê-los funciona normalmente', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ id: 'nova' });
      vi.mocked(useCriarContaBancaria).mockReturnValue({ mutateAsync, isPending: false } as any);
      vi.mocked(useContasBancarias).mockReturnValue({ data: [], isLoading: false } as any);
      render(<ContasBancariasTab colaboradorId="col-1" />);

      const [, nomeBanco, agencia, , conta] = screen.getAllByRole('textbox');
      fireEvent.change(nomeBanco, { target: { value: 'Banco X' } });
      fireEvent.change(agencia, { target: { value: '0001' } });
      fireEvent.change(conta, { target: { value: '12345' } });

      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ agencia_digito: '', digito: '' })
      );
    });

    it('exibe o dígito ao lado da agência/conta mascaradas quando presente', () => {
      const contaComDigito = [{ ...MOCK_CONTAS[0], agencia_digito: '2', digito: '6' }];
      vi.mocked(useContasBancarias).mockReturnValue({ data: contaComDigito, isLoading: false } as any);
      render(<ContasBancariasTab colaboradorId="col-1" />);
      expect(screen.getByText(`${maskBankAccount('1234')}-2`)).toBeInTheDocument();
      expect(screen.getByText(`${maskBankAccount('56789-0')}-6`)).toBeInTheDocument();
    });
  });
});
