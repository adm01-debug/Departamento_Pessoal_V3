import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const atualizarMutateAsync = vi.fn();
const criarMutateAsync = vi.fn();

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useContatosEmergencia: vi.fn(),
  useCriarContatoEmergencia: vi.fn(() => ({ mutateAsync: criarMutateAsync, isPending: false })),
  useAtualizarContatoEmergencia: vi.fn(() => ({ mutateAsync: atualizarMutateAsync, isPending: false })),
  useExcluirContatoEmergencia: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// A tabela sempre exibe mascarado aqui; `podeVerPii` controla o privilégio, que
// é o que decide se a edição (que mostra o valor real) pode ser aberta.
const piiFlag = vi.hoisted(() => ({ podeVerPii: true }));
vi.mock('@/hooks/usePiiMask', () => ({
  usePiiMask: () => ({
    canViewPii: piiFlag.podeVerPii,
    phone: () => '***-****',
    email: () => '***@***',
    cpf: () => '***',
    deep: (v: unknown) => v,
  }),
}));

// O Dialog real é portal + controlado; aqui o conteúdo renderiza sempre, para
// que os campos do formulário sejam inspecionáveis.
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

import { toast } from 'sonner';
import { useContatosEmergencia } from '@/hooks/useColaboradorDetalhes';
import { EmergenciaTab } from '../EmergenciaTab';

const MOCK_CONTATOS = [
  {
    id: 'e1',
    nome: 'Maria Silva',
    parentesco: 'Cônjuge',
    telefone: '(31) 3333-4444',
    celular: '(31) 99999-8888',
    email: 'maria@example.com',
  },
];

describe('EmergenciaTab — edição de contato', () => {
  beforeEach(() => {
    atualizarMutateAsync.mockReset();
    criarMutateAsync.mockReset();
    vi.mocked(toast.error).mockReset();
    piiFlag.podeVerPii = true;
  });

  it('mostra FalhaConsulta quando a consulta falha, em vez de estado vazio', () => {
    vi.mocked(useContatosEmergencia).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);
    expect(screen.getByText(/Não foi possível carregar os contatos de emergência/)).toBeInTheDocument();
    expect(screen.queryByText('Nenhum contato cadastrado.')).not.toBeInTheDocument();
  });

  it('expõe um botão de editar por contato', () => {
    vi.mocked(useContatosEmergencia).mockReturnValue({
      data: MOCK_CONTATOS,
      isLoading: false,
      isError: false,
    } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);
    expect(screen.getByLabelText('Editar contato')).toBeInTheDocument();
  });

  it('abre o diálogo em modo edição com o título correto', async () => {
    vi.mocked(useContatosEmergencia).mockReturnValue({
      data: MOCK_CONTATOS,
      isLoading: false,
      isError: false,
    } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);
    expect(screen.getByText('Novo Contato de Emergência')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Editar contato'));
    expect(screen.getByText('Editar Contato de Emergência')).toBeInTheDocument();
    expect(screen.queryByText('Novo Contato de Emergência')).not.toBeInTheDocument();
  });

  it('preenche o formulário com o telefone REAL, não com a máscara exibida na tabela', async () => {
    vi.mocked(useContatosEmergencia).mockReturnValue({
      data: MOCK_CONTATOS,
      isLoading: false,
      isError: false,
    } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);
    // A tabela exibe mascarado (papel sem privilégio de PII).
    expect(screen.getAllByText('***-****').length).toBeGreaterThanOrEqual(2);

    await userEvent.click(screen.getByLabelText('Editar contato'));
    expect(screen.getByDisplayValue('(31) 3333-4444')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(31) 99999-8888')).toBeInTheDocument();
    expect(screen.getByDisplayValue('maria@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Maria Silva')).toBeInTheDocument();
  });

  it('salvar em modo edição chama atualizar com id e dados, e não cria um novo contato', async () => {
    atualizarMutateAsync.mockResolvedValue(undefined);
    vi.mocked(useContatosEmergencia).mockReturnValue({
      data: MOCK_CONTATOS,
      isLoading: false,
      isError: false,
    } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);

    await userEvent.click(screen.getByLabelText('Editar contato'));
    const telefone = screen.getByDisplayValue('(31) 3333-4444');
    await userEvent.clear(telefone);
    await userEvent.type(telefone, '(31) 3333-0000');
    await userEvent.click(screen.getByText('Salvar'));

    await waitFor(() => expect(atualizarMutateAsync).toHaveBeenCalledTimes(1));
    expect(atualizarMutateAsync).toHaveBeenCalledWith({
      id: 'e1',
      dados: {
        nome: 'Maria Silva',
        parentesco: 'Cônjuge',
        telefone: '(31) 3333-0000',
        celular: '(31) 99999-8888',
        email: 'maria@example.com',
      },
    });
    expect(criarMutateAsync).not.toHaveBeenCalled();
  });

  it('volta para modo criação ao reabrir pelo botão Adicionar', async () => {
    atualizarMutateAsync.mockResolvedValue(undefined);
    vi.mocked(useContatosEmergencia).mockReturnValue({
      data: MOCK_CONTATOS,
      isLoading: false,
      isError: false,
    } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);

    await userEvent.click(screen.getByLabelText('Editar contato'));
    expect(screen.getByText('Editar Contato de Emergência')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Adicionar'));
    expect(screen.getByText('Novo Contato de Emergência')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Maria Silva')).not.toBeInTheDocument();
  });
  it('não abre a edição para quem não pode ver PII (o formulário mostra o valor real)', async () => {
    piiFlag.podeVerPii = false;
    vi.mocked(useContatosEmergencia).mockReturnValue({
      data: MOCK_CONTATOS,
      isLoading: false,
      isError: false,
    } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);

    await userEvent.click(screen.getByLabelText('Editar contato'));
    expect(toast.error).toHaveBeenCalled();
    expect(screen.getByText('Novo Contato de Emergência')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('(31) 3333-4444')).not.toBeInTheDocument();
  });

  it('salva null, não string vazia, nos campos opcionais em branco', async () => {
    atualizarMutateAsync.mockResolvedValue(undefined);
    vi.mocked(useContatosEmergencia).mockReturnValue({
      data: [{ ...MOCK_CONTATOS[0], email: null, parentesco: null, celular: null }],
      isLoading: false,
      isError: false,
    } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);

    await userEvent.click(screen.getByLabelText('Editar contato'));
    await userEvent.click(screen.getByText('Salvar'));

    await waitFor(() => expect(atualizarMutateAsync).toHaveBeenCalledTimes(1));
    expect(atualizarMutateAsync).toHaveBeenCalledWith({
      id: 'e1',
      dados: {
        nome: 'Maria Silva',
        parentesco: null,
        telefone: '(31) 3333-4444',
        celular: null,
        email: null,
      },
    });
  });
});
