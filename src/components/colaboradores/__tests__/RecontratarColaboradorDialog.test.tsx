import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecontratarColaboradorDialog } from '../RecontratarColaboradorDialog';
import type { Colaborador } from '@/types/entities';
import type { VinculosResumo } from '@/services/vinculoService';
import { todayLocalISO } from '@/utils/dateLocal';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn<(vars: unknown) => Promise<unknown>>(),
  isPending: false,
  resumo: {
    data: undefined as Record<string, VinculosResumo> | undefined,
    isLoading: false,
    isError: false,
  },
}));

vi.mock('@/hooks/useVinculos', () => ({
  useRecontratarColaborador: () => ({ mutateAsync: mocks.mutateAsync, isPending: mocks.isPending }),
  useVinculosResumo: () => mocks.resumo,
}));

vi.mock('@/hooks/useCargos', () => ({
  useCargos: () => ({
    cargos: [
      { id: 'c1', nome: 'Analista Fiscal' },
      { id: 'c2', nome: 'Auxiliar de DP' },
    ],
  }),
}));

vi.mock('@/hooks/useDepartamentos', () => ({
  useDepartamentos: () => ({ departamentos: [{ id: 'd1', nome: 'Financeiro' }] }),
}));

beforeAll(() => {
  // Radix Select usa Pointer Capture no jsdom, que não implementa a API.
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  });
});

const COLABORADOR: Colaborador = {
  id: 'col-1',
  nome_completo: 'Maria Souza',
  cpf: '12345678901',
  email: 'maria@example.com',
  status: 'desligado',
  empresa_id: 'emp-1',
  cargo: 'Analista Fiscal',
  departamento: 'Financeiro',
  salario_base: 3500,
};

const RESUMO: VinculosResumo = {
  quantidadePassagens: 2,
  quantidadeRecontratacoes: 1,
  primeiraAdmissao: '2019-03-01',
  admissaoAtual: '2022-07-15',
  ultimoEncerramento: '2021-12-31',
};

beforeEach(() => {
  mocks.mutateAsync.mockReset();
  mocks.mutateAsync.mockResolvedValue({});
  mocks.isPending = false;
  mocks.resumo = { data: { [COLABORADOR.id]: RESUMO }, isLoading: false, isError: false };
});

function renderDialog(colaborador: Colaborador = COLABORADOR, onOpenChange = vi.fn()) {
  render(<RecontratarColaboradorDialog colaborador={colaborador} open onOpenChange={onOpenChange} />);
  return { onOpenChange };
}

describe('RecontratarColaboradorDialog', () => {
  it('mostra skeleton enquanto o resumo de vínculos carrega', () => {
    mocks.resumo = { data: undefined, isLoading: true, isError: false };
    renderDialog();

    expect(screen.getByTestId('recontratar-resumo-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Passagens')).not.toBeInTheDocument();
  });

  it('não inventa "0 passagens" quando a consulta do resumo falha', () => {
    mocks.resumo = { data: undefined, isLoading: false, isError: true };
    renderDialog();

    expect(screen.getByText('Não foi possível carregar o histórico de vínculos. Tente novamente.')).toBeInTheDocument();
    expect(screen.queryByText('Passagens')).not.toBeInTheDocument();
  });

  it('mostra estado vazio honesto quando não há vínculo anterior', () => {
    mocks.resumo = { data: {}, isLoading: false, isError: false };
    renderDialog();

    expect(screen.getByText('Nenhum vínculo anterior registrado.')).toBeInTheDocument();
  });

  it('exibe o resumo real de passagens com datas no fuso local', () => {
    renderDialog();

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('15/07/2022')).toBeInTheDocument();
    // `new Date('2019-03-01')` em UTC-3 cairia em 28/02/2019.
    expect(screen.getByText('01/03/2019')).toBeInTheDocument();
  });

  it('mascara o CPF do colaborador (sem contexto de auth, sem PII crua)', () => {
    renderDialog();

    expect(screen.queryByText(/12345678901/)).not.toBeInTheDocument();
  });

  it('envia a nova admissão com cargo, departamento e salário da última passagem', async () => {
    const { onOpenChange } = renderDialog();

    const confirmar = screen.getByRole('button', { name: 'Confirmar recontratação' });
    await waitFor(() => expect(confirmar).toBeEnabled());
    await userEvent.click(confirmar);

    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      id: 'col-1',
      dados: {
        data_admissao: todayLocalISO(),
        cargo: 'Analista Fiscal',
        // Vai junto com o texto: o dossie prioriza o nome que vem da referencia
        // (`cargoDetalhe?.nome ?? colaborador?.cargo`), entao gravar so o texto
        // mostraria o cargo de antes da recontratacao.
        cargo_id: 'c1',
        departamento: 'Financeiro',
        salario_base: 3500,
      },
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('bloqueia confirmação sem data de admissão', async () => {
    renderDialog();

    await userEvent.click(screen.getByLabelText('Nova data de admissão'));
    await userEvent.click(await screen.findByRole('button', { name: 'Limpar' }));

    expect(screen.getByText('Informe a nova data de admissão.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar recontratação' })).toBeDisabled();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('bloqueia nova admissão que se sobreporia à passagem anterior', () => {
    // Admitido e desligado no mesmo dia: a data padrão (hoje) não pode valer.
    mocks.resumo = {
      data: { [COLABORADOR.id]: { ...RESUMO, admissaoAtual: todayLocalISO() } },
      isLoading: false,
      isError: false,
    };
    renderDialog();

    expect(screen.getByText(/A nova admissão precisa ser posterior a/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar recontratação' })).toBeDisabled();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('bloqueia nova admissão anterior ao DESLIGAMENTO da última passagem', () => {
    // Admitido muito antes, desligado hoje: comparar só com `admissaoAtual`
    // deixava a data de hoje passar e gravava duas passagens sobrepostas.
    mocks.resumo = {
      data: {
        [COLABORADOR.id]: { ...RESUMO, admissaoAtual: '2019-03-01', ultimoEncerramento: todayLocalISO() },
      },
      isLoading: false,
      isError: false,
    };
    renderDialog();

    expect(screen.getByText(/A nova admissão precisa ser posterior a/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar recontratação' })).toBeDisabled();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('bloqueia sobreposição com a passagem do cadastro legado (resumo vazio)', () => {
    // Cadastro legado: nenhuma linha em `vinculos`, então o resumo volta vazio
    // e as datas da passagem antiga só existem em `colaboradores`. Sem elas na
    // validação o formulário liberava qualquer data.
    mocks.resumo = { data: {}, isLoading: false, isError: false };
    renderDialog({ ...COLABORADOR, data_admissao: '2019-03-01', data_desligamento: todayLocalISO() } as Colaborador);

    expect(screen.getByText(/A nova admissão precisa ser posterior a/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar recontratação' })).toBeDisabled();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('não confirma enquanto o resumo de vínculos não pôde ser lido', () => {
    // Sem a última admissão não há como barrar sobreposição: fail-closed.
    mocks.resumo = { data: undefined, isLoading: false, isError: true };
    renderDialog();

    expect(screen.getByRole('button', { name: 'Confirmar recontratação' })).toBeDisabled();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('recusa recontratar quem não está desligado', async () => {
    const { onOpenChange } = renderDialog({ ...COLABORADOR, status: 'ativo' });

    expect(screen.getByText('Somente colaboradores desligados podem ser recontratados.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar recontratação' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('mantém o diálogo aberto quando a mutation falha', async () => {
    mocks.mutateAsync.mockRejectedValue(new Error('falha'));
    const { onOpenChange } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar recontratação' }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('não envia nada enquanto a recontratação está em andamento', () => {
    mocks.isPending = true;
    renderDialog();

    expect(screen.getByRole('button', { name: 'Recontratando...' })).toBeDisabled();
  });
});
