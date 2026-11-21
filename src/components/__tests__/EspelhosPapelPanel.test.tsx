import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  listarColaboradoresAtivos: vi.fn(),
  listarEspelhosPapel: vi.fn(),
  salvarEspelhoPapel: vi.fn(),
  anexarDigitalizacao: vi.fn(),
  urlDigitalizacao: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

vi.mock('@/services/relogio/espelhosPapelService', () => ({
  competenciaDoMes: (mes: string) => {
    if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error('inválida');
    return `${mes}-01`;
  },
  listarColaboradoresAtivos: mocks.listarColaboradoresAtivos,
  listarEspelhosPapel: mocks.listarEspelhosPapel,
  salvarEspelhoPapel: mocks.salvarEspelhoPapel,
  anexarDigitalizacao: mocks.anexarDigitalizacao,
  urlDigitalizacao: mocks.urlDigitalizacao,
}));

import { EspelhosPapelPanel } from '../ponto/EspelhosPapelPanel';

function render(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const EMPRESA = 'e1';
const COLABS = [
  { id: 'c1', nome_completo: 'Ana Souza' },
  { id: 'c2', nome_completo: 'Bruno Lima' },
];

function espelho(over: Record<string, unknown>) {
  return {
    id: 'r1',
    empresa_id: EMPRESA,
    colaborador_id: 'c1',
    competencia: '2026-11-01',
    devolvido_em: null,
    registrado_por: null,
    observacao: null,
    arquivo_path: null,
    created_at: '2026-11-20T12:00:00Z',
    updated_at: '2026-11-20T12:00:00Z',
    ...over,
  };
}

describe('EspelhosPapelPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listarColaboradoresAtivos.mockResolvedValue(COLABS);
    mocks.listarEspelhosPapel.mockResolvedValue([espelho({ devolvido_em: '2026-11-20T15:00:00' })]);
  });

  it('mostra carregando e depois lista devolvidos, pendentes e o contador', async () => {
    render(<EspelhosPapelPanel empresaId={EMPRESA} />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Devolvido em 20/11')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByTestId('espelho-papel-pendentes')).toHaveTextContent('1 pendente');
    expect(mocks.listarColaboradoresAtivos).toHaveBeenCalledWith(EMPRESA);
    expect(mocks.listarEspelhosPapel).toHaveBeenCalledWith(EMPRESA, expect.stringMatching(/^\d{4}-\d{2}-01$/));
  });

  it('recarrega ao trocar a competência', async () => {
    const { container } = render(<EspelhosPapelPanel empresaId={EMPRESA} />);
    await screen.findByText('Ana Souza');
    const input = container.querySelector('input[type="month"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-10' } });
    await waitFor(() => expect(mocks.listarEspelhosPapel).toHaveBeenLastCalledWith(EMPRESA, '2026-10-01'));
  });

  it('marca como devolvido e zera o contador', async () => {
    mocks.salvarEspelhoPapel.mockResolvedValue(
      espelho({ id: 'r2', colaborador_id: 'c2', devolvido_em: '2026-11-21T10:00:00' })
    );
    render(<EspelhosPapelPanel empresaId={EMPRESA} />);
    await screen.findByText('Bruno Lima');

    fireEvent.click(screen.getByRole('button', { name: 'Marcar devolvido' }));

    await waitFor(() => expect(screen.getByTestId('espelho-papel-pendentes')).toHaveTextContent('0 pendentes'));
    const [empresa, colab, comp, patch] = mocks.salvarEspelhoPapel.mock.calls[0];
    expect([empresa, colab]).toEqual([EMPRESA, 'c2']);
    expect(comp).toMatch(/^\d{4}-\d{2}-01$/);
    expect(typeof patch.devolvido_em).toBe('string');
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it('desmarca enviando devolvido_em nulo', async () => {
    mocks.salvarEspelhoPapel.mockResolvedValue(espelho({ devolvido_em: null }));
    render(<EspelhosPapelPanel empresaId={EMPRESA} />);
    await screen.findByText('Devolvido em 20/11');

    fireEvent.click(screen.getByRole('button', { name: 'Desmarcar' }));

    await waitFor(() => expect(screen.getByTestId('espelho-papel-pendentes')).toHaveTextContent('2 pendentes'));
    expect(mocks.salvarEspelhoPapel.mock.calls[0][3]).toEqual({ devolvido_em: null });
  });

  it('salva a observação ao sair do campo', async () => {
    mocks.salvarEspelhoPapel.mockResolvedValue(espelho({ colaborador_id: 'c2', observacao: 'entregou rasurado' }));
    render(<EspelhosPapelPanel empresaId={EMPRESA} />);
    const campo = await screen.findByLabelText('Observação de Bruno Lima');

    fireEvent.change(campo, { target: { value: 'entregou rasurado' } });
    fireEvent.blur(campo);

    await waitFor(() =>
      expect(mocks.salvarEspelhoPapel).toHaveBeenCalledWith(EMPRESA, 'c2', expect.any(String), {
        observacao: 'entregou rasurado',
      })
    );
  });

  it('anexa a digitalização', async () => {
    mocks.anexarDigitalizacao.mockResolvedValue(espelho({ colaborador_id: 'c2', arquivo_path: 'e1/c2/x.pdf' }));
    render(<EspelhosPapelPanel empresaId={EMPRESA} />);
    const input = await screen.findByLabelText('Anexar digitalização de Bruno Lima');
    const file = new File(['%PDF'], 'espelho.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(mocks.anexarDigitalizacao).toHaveBeenCalledWith(EMPRESA, 'c2', expect.any(String), file)
    );
    expect(await screen.findByLabelText('Ver digitalização de Bruno Lima')).toBeInTheDocument();
  });

  it('mostra erro ao salvar sem quebrar a lista', async () => {
    mocks.salvarEspelhoPapel.mockRejectedValue(new Error('new row violates row-level security policy'));
    render(<EspelhosPapelPanel empresaId={EMPRESA} />);
    await screen.findByText('Bruno Lima');

    fireEvent.click(screen.getByRole('button', { name: 'Marcar devolvido' }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
    expect(screen.getByTestId('espelho-papel-pendentes')).toHaveTextContent('1 pendente');
  });

  it('mostra estado vazio sem colaboradores', async () => {
    mocks.listarColaboradoresAtivos.mockResolvedValue([]);
    mocks.listarEspelhosPapel.mockResolvedValue([]);
    render(<EspelhosPapelPanel empresaId={EMPRESA} />);
    expect(await screen.findByText('Nenhum colaborador ativo nesta empresa.')).toBeInTheDocument();
  });

  it('mostra erro de carregamento e tenta de novo', async () => {
    mocks.listarEspelhosPapel.mockRejectedValueOnce(new Error('falhou'));
    render(<EspelhosPapelPanel empresaId={EMPRESA} />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
  });
});
