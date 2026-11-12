import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  criarNotificacao: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

vi.mock('@/services/notificacoesService', () => ({
  criarNotificacao: mocks.criarNotificacao,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from, auth: { getUser: mocks.getUser } },
}));

/** Builder encadeável do PostgREST: `.eq()` devolve o próprio builder e o
 * terminal (`maybeSingle`/`select` após update) resolve com `result`. */
function builder(result: { data: unknown; error: unknown }) {
  const b: Record<string, ReturnType<typeof vi.fn>> = {};
  b.select = vi.fn(() => b);
  b.update = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  (b as unknown as { then: unknown }).then = (resolve: (v: unknown) => unknown) => resolve(result);
  return b;
}

import { PontoInconsistencyPanel } from '../ponto/PontoInconsistencyPanel';
import type { RegistroComColaborador } from '../ponto/PontoInconsistencyPanel';

const SHORT_BREAK_REGISTROS = [
  {
    id: '1',
    colaborador_id: 'c1',
    empresa_id: 'emp-1',
    data: '2024-07-01',
    colaborador: { nome_completo: 'Maria Santos' },
    entrada_1: '08:00',
    saida_1: '17:00',
    saida_intervalo: '12:00',
    retorno_intervalo: '12:30',
  },
] as unknown as RegistroComColaborador[];

const FORGOTTEN_OUT_REGISTROS = [
  {
    id: 'r9',
    colaborador_id: 'c9',
    empresa_id: 'emp-1',
    data: '2024-07-01',
    colaborador: { nome_completo: 'João Lima' },
    entrada_1: '08:00',
    saida_1: null,
  },
] as unknown as RegistroComColaborador[];

describe('PontoInconsistencyPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'gestor-1' } } });
  });

  it('renders without crash when registros is empty', () => {
    const { container } = render(<PontoInconsistencyPanel registros={[]} />);
    expect(container).toBeInTheDocument();
  });

  it('shows Insights de Inteligência when inconsistency detected', () => {
    render(<PontoInconsistencyPanel registros={SHORT_BREAK_REGISTROS} />);
    expect(screen.getByText(/Insights de Inteligência/)).toBeInTheDocument();
  });

  it('shows Resolução Assistida Ativa badge when inconsistencies exist', () => {
    render(<PontoInconsistencyPanel registros={SHORT_BREAK_REGISTROS} />);
    expect(screen.getByText('Resolução Assistida Ativa')).toBeInTheDocument();
  });

  it('shows colaborador name in inconsistency card', () => {
    render(<PontoInconsistencyPanel registros={SHORT_BREAK_REGISTROS} />);
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
  });

  it('shows short break description', () => {
    render(<PontoInconsistencyPanel registros={SHORT_BREAK_REGISTROS} />);
    expect(screen.getByText(/Intervalo curto/)).toBeInTheDocument();
  });

  it('"Ver lista completa" mostra todas as inconsistências além das 6 primeiras', () => {
    const muitos = Array.from({ length: 8 }, (_, i) => ({
      ...SHORT_BREAK_REGISTROS[0],
      id: String(i + 1),
      colaborador: { nome_completo: `Colab ${i + 1}` },
    })) as unknown as RegistroComColaborador[];
    render(<PontoInconsistencyPanel registros={muitos} />);
    expect(screen.queryByText('Colab 8')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Ver lista completa'));
    expect(screen.getByText('Colab 7')).toBeInTheDocument();
    expect(screen.getByText('Colab 8')).toBeInTheDocument();
    expect(screen.queryByText('Ver lista completa')).not.toBeInTheDocument();
  });

  it('"Aprovar Exceção" grava aprovado/aprovado_por em registros_ponto e só então confirma', async () => {
    const b = builder({ data: [{ id: '1' }], error: null });
    mocks.from.mockReturnValue(b);
    render(<PontoInconsistencyPanel registros={SHORT_BREAK_REGISTROS} />);
    fireEvent.click(screen.getByText('Aprovar Exceção'));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Exceção aprovada para Maria Santos.'));
    expect(mocks.from).toHaveBeenCalledWith('registros_ponto');
    expect(b.update).toHaveBeenCalledWith(expect.objectContaining({ aprovado: true, aprovado_por: 'gestor-1' }));
    expect(b.eq).toHaveBeenCalledWith('id', '1');
    expect(b.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
    expect(screen.queryByText(/Intervalo curto/)).not.toBeInTheDocument();
  });

  it('"Aprovar Exceção" sem linha atualizada (RLS) mostra erro e mantém o alerta', async () => {
    mocks.from.mockReturnValue(builder({ data: [], error: null }));
    render(<PontoInconsistencyPanel registros={SHORT_BREAK_REGISTROS} />);
    fireEvent.click(screen.getByText('Aprovar Exceção'));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Sem permissão para aprovar este registro.'));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByText(/Intervalo curto/)).toBeInTheDocument();
  });

  it('não alerta intervalo curto de registro já aprovado', () => {
    const aprovado = [{ ...SHORT_BREAK_REGISTROS[0], aprovado: true }] as unknown as RegistroComColaborador[];
    render(<PontoInconsistencyPanel registros={aprovado} />);
    expect(screen.queryByText(/Intervalo curto/)).not.toBeInTheDocument();
  });

  it('"Cobrar Justificativa" notifica o login do próprio colaborador', async () => {
    const b = builder({ data: { user_id: 'user-c9' }, error: null });
    mocks.from.mockReturnValue(b);
    mocks.criarNotificacao.mockResolvedValue(undefined);
    render(<PontoInconsistencyPanel registros={FORGOTTEN_OUT_REGISTROS} />);
    fireEvent.click(screen.getByText('Cobrar Justificativa'));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Justificativa solicitada a João Lima.'));
    expect(mocks.from).toHaveBeenCalledWith('colaboradores');
    expect(b.eq).toHaveBeenCalledWith('id', 'c9');
    expect(mocks.criarNotificacao).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-c9',
        empresa_id: 'emp-1',
        tipo: 'alerta',
        entidade_tipo: 'registro_ponto',
        entidade_id: 'r9',
      })
    );
  });

  it('"Cobrar Justificativa" sem login vinculado não notifica ninguém e avisa o erro', async () => {
    mocks.from.mockReturnValue(builder({ data: { user_id: null }, error: null }));
    render(<PontoInconsistencyPanel registros={FORGOTTEN_OUT_REGISTROS} />);
    fireEvent.click(screen.getByText('Cobrar Justificativa'));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
    expect(mocks.criarNotificacao).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByText('João Lima')).toBeInTheDocument();
  });

  it('não exibe ações sem efeito real (Sugerir Saída, Compensar, Alerta Gestor)', () => {
    render(<PontoInconsistencyPanel registros={FORGOTTEN_OUT_REGISTROS} />);
    expect(screen.queryByText(/Sugerir Saída/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Compensar/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Alerta Gestor/)).not.toBeInTheDocument();
  });

  it('"Ocultar" só esconde localmente: sem gravação nem toast de sucesso', () => {
    render(<PontoInconsistencyPanel registros={SHORT_BREAK_REGISTROS} />);
    fireEvent.click(screen.getByLabelText('Ocultar'));
    expect(screen.queryByText(/Intervalo curto/)).not.toBeInTheDocument();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });
});
