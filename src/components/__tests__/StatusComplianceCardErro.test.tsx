import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Falha de consulta NUNCA pode virar "Conforme".
 *
 * O card de Status de Compliance pinta badges verdes a partir de listas vazias.
 * Enquanto só `isLoading` era lido, uma consulta que FALHAVA (RLS, rede, 500)
 * caía no mesmo caminho de "nenhum registro": o RH via "Conforme" em verde para
 * um colaborador com advertências graves registradas e parava de olhar.
 */
const hooks = {
  useMedidasDisciplinaresColaborador: vi.fn(),
  useTreinamentosColaborador: vi.fn(),
  useEpisEntregasColaborador: vi.fn(),
};

vi.mock('@/hooks', () => hooks);
vi.mock('@/hooks/useComplianceColaborador', () => ({ useConsentimentosColaborador: vi.fn() }));
vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }));
vi.mock('@/components/colaborador-detalhes/documentos/StatusComplianceDialog', () => ({
  StatusComplianceDialog: () => null,
}));

const { useConsentimentosColaborador } = await import('@/hooks/useComplianceColaborador');
const { StatusComplianceCard } = await import('@/components/colaborador-detalhes/documentos/StatusComplianceCard');

const ok = (data: unknown[]) => ({ data, isLoading: false, isError: false });
const falhou = { data: undefined, isLoading: false, isError: true };

function montar(medidas: ReturnType<typeof ok> | typeof falhou) {
  hooks.useMedidasDisciplinaresColaborador.mockReturnValue(medidas);
  hooks.useTreinamentosColaborador.mockReturnValue(ok([]));
  hooks.useEpisEntregasColaborador.mockReturnValue(ok([]));
  vi.mocked(useConsentimentosColaborador).mockReturnValue(ok([]) as never);
  render(<StatusComplianceCard colaboradorId="col-1" />);
}

afterEach(() => vi.clearAllMocks());

describe('StatusComplianceCard — falha de consulta não vira conformidade', () => {
  it('avisa que não foi possível carregar quando uma das fontes falha', () => {
    montar(falhou);
    expect(screen.getByText(/Não foi possível carregar o status de compliance/)).toBeInTheDocument();
    expect(screen.queryByText('Conforme')).toBeNull();
  });

  it('com todas as fontes respondendo vazio, segue mostrando conformidade', () => {
    montar(ok([]));
    expect(screen.queryByText(/Não foi possível carregar/)).toBeNull();
    expect(screen.getAllByText('Conforme').length).toBeGreaterThan(0);
  });
});
