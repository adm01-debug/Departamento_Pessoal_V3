import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const order = vi.fn();
const eq = vi.fn(() => ({ order }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => from(...(args as [])) },
}));

vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((_e: unknown, d: string) => d) }));

import { HistoricoSimulacoesDialog } from '../folha/HistoricoSimulacoesDialog';

function renderDialog(empresaId?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  render(<HistoricoSimulacoesDialog empresaId={empresaId} />, { wrapper });
}

function abrir() {
  fireEvent.click(screen.getByRole('button', { name: 'Histórico de simulações' }));
}

describe('HistoricoSimulacoesDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não consulta o banco antes de abrir', () => {
    renderDialog('emp-1');
    expect(from).not.toHaveBeenCalled();
  });

  it('lista as simulações salvas da empresa, mais recentes primeiro', async () => {
    order.mockResolvedValue({
      data: [
        { id: 's2', titulo: 'Cenário B', created_at: '2026-11-10T12:00:00Z', resultado: { custoTotal: 9876.5 } },
        { id: 's1', titulo: 'Cenário A', created_at: '2026-11-01T12:00:00Z', resultado: { impacto_total: 100 } },
      ],
      error: null,
    });
    renderDialog('emp-1');
    abrir();

    expect(await screen.findByText('Cenário B')).toBeInTheDocument();
    expect(screen.getByText('Cenário A')).toBeInTheDocument();
    expect(screen.getByText('Custo Total Estimado')).toBeInTheDocument();
    expect(screen.getByText('Impacto Estimado')).toBeInTheDocument();
    expect(from).toHaveBeenCalledWith('simulacoes_fiscais');
    expect(eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('mostra estado vazio quando não há simulações', async () => {
    order.mockResolvedValue({ data: [], error: null });
    renderDialog('emp-1');
    abrir();
    expect(await screen.findByText('Nenhuma simulação salva para esta empresa.')).toBeInTheDocument();
  });

  it('mostra erro e permite tentar novamente', async () => {
    order.mockResolvedValueOnce({ data: null, error: { message: 'falhou' } });
    renderDialog('emp-1');
    abrir();
    expect(await screen.findByText('Erro ao carregar simulações.')).toBeInTheDocument();

    order.mockResolvedValueOnce({ data: [], error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma simulação salva para esta empresa.')).toBeInTheDocument();
  });

  it('desabilita o botão sem empresa selecionada', () => {
    renderDialog(undefined);
    expect(screen.getByRole('button', { name: 'Histórico de simulações' })).toBeDisabled();
  });
});
