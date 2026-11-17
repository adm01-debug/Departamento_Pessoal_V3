import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const atualizarMutateAsync = vi.fn();
const criarMutateAsync = vi.fn();

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useFormacoes: vi.fn(),
  useCriarFormacao: vi.fn(() => ({ mutateAsync: criarMutateAsync, isPending: false })),
  useAtualizarFormacao: vi.fn(() => ({ mutateAsync: atualizarMutateAsync, isPending: false })),
  useExcluirFormacao: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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

import { useFormacoes } from '@/hooks/useColaboradorDetalhes';
import { FormacaoTab } from '../FormacaoTab';

const MOCK_FORMACOES = [
  {
    id: 'f1',
    tipo_escolaridade: 'Superior completo',
    curso: 'Administração',
    instituicao: 'UFMG',
    ano_conclusao: 2015,
  },
];

describe('FormacaoTab — edição de formação', () => {
  beforeEach(() => {
    atualizarMutateAsync.mockReset();
    criarMutateAsync.mockReset();
    vi.mocked(useFormacoes).mockReturnValue({ data: MOCK_FORMACOES, isLoading: false } as never);
  });

  it('expõe um botão de editar por formação', () => {
    render(<FormacaoTab colaboradorId="col-1" />);
    expect(screen.getByLabelText('Editar formação')).toBeInTheDocument();
  });

  it('abre o diálogo em modo edição com o título correto e os valores atuais', async () => {
    render(<FormacaoTab colaboradorId="col-1" />);
    expect(screen.getByText('Nova Formação')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Editar formação'));
    expect(screen.getByText('Editar Formação')).toBeInTheDocument();
    expect(screen.queryByText('Nova Formação')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Administração')).toBeInTheDocument();
    expect(screen.getByDisplayValue('UFMG')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2015')).toBeInTheDocument();
  });

  it('salvar em modo edição chama atualizar com id e dados, e não cria uma nova formação', async () => {
    atualizarMutateAsync.mockResolvedValue(undefined);
    render(<FormacaoTab colaboradorId="col-1" />);

    await userEvent.click(screen.getByLabelText('Editar formação'));
    const curso = screen.getByDisplayValue('Administração');
    await userEvent.clear(curso);
    await userEvent.type(curso, 'Engenharia');
    await userEvent.click(screen.getByText('Salvar'));

    await waitFor(() => expect(atualizarMutateAsync).toHaveBeenCalledTimes(1));
    expect(atualizarMutateAsync).toHaveBeenCalledWith({
      id: 'f1',
      dados: {
        tipo_escolaridade: 'Superior completo',
        curso: 'Engenharia',
        instituicao: 'UFMG',
        ano_conclusao: 2015,
      },
    });
    expect(criarMutateAsync).not.toHaveBeenCalled();
  });

  it('salva null, não string vazia, nos campos opcionais em branco', async () => {
    atualizarMutateAsync.mockResolvedValue(undefined);
    vi.mocked(useFormacoes).mockReturnValue({
      data: [{ ...MOCK_FORMACOES[0], curso: null, instituicao: null, ano_conclusao: null }],
      isLoading: false,
    } as never);
    render(<FormacaoTab colaboradorId="col-1" />);

    await userEvent.click(screen.getByLabelText('Editar formação'));
    await userEvent.click(screen.getByText('Salvar'));

    await waitFor(() => expect(atualizarMutateAsync).toHaveBeenCalledTimes(1));
    expect(atualizarMutateAsync).toHaveBeenCalledWith({
      id: 'f1',
      dados: {
        tipo_escolaridade: 'Superior completo',
        curso: null,
        instituicao: null,
        ano_conclusao: null,
      },
    });
  });

  it('volta para modo criação ao reabrir pelo botão Adicionar', async () => {
    render(<FormacaoTab colaboradorId="col-1" />);

    await userEvent.click(screen.getByLabelText('Editar formação'));
    expect(screen.getByText('Editar Formação')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Adicionar'));
    expect(screen.getByText('Nova Formação')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Administração')).not.toBeInTheDocument();
  });
});
