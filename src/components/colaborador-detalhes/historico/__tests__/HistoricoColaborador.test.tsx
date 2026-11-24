import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TimelineEvent } from '@/types/timelineEvent';

const { mockUseHistoricoColaborador } = vi.hoisted(() => ({ mockUseHistoricoColaborador: vi.fn() }));
vi.mock('@/hooks/useHistoricoColaborador', () => ({ useHistoricoColaborador: mockUseHistoricoColaborador }));

import { HistoricoColaborador } from '../HistoricoColaborador';

const EVENTS: TimelineEvent[] = [
  { id: 'ferias-1', date: '2026-11-10', type: 'ferias', title: 'Férias (aprovada)', description: '10/11/2026 a 24/11/2026 · 15 dias', source: 'ferias' },
  { id: 'treino-1', date: '2026-04-15', type: 'treinamento', title: 'Treinamento: Integração e Cultura Organizacional', secondary: 'Carga horária: 8h', source: 'treinamento_participantes' },
  { id: 'medida-1', date: '2025-12-01', type: 'medida_disciplinar', title: 'Medida disciplinar: Advertência verbal', description: 'leve', source: 'medidas_disciplinares' },
  { id: 'vinculo-1', date: '2020-01-10', type: 'vinculo', title: 'Admissão inicial', source: 'vinculos' },
];

function renderComponent() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <HistoricoColaborador colaboradorId="col-1" proximosEventos={[]} onVerTodosProximosEventos={vi.fn()} />
    </QueryClientProvider>
  );
}

describe('HistoricoColaborador', () => {
  beforeEach(() => {
    mockUseHistoricoColaborador.mockReturnValue({
      events: EVENTS,
      isLoading: false,
      colaborador: { data_admissao: '2020-01-10', status: 'ativo', tipo_contrato: 'clt' },
      criarSalario: vi.fn(),
      criandoSalario: false,
      criarContrato: vi.fn(),
      excluirContrato: vi.fn(),
    });
  });

  it('groups events by year and shows the two most recent years expanded by default', () => {
    renderComponent();
    const timeline = screen.getByTestId('history-timeline');
    expect(screen.getByText('Histórico do Colaborador')).toBeInTheDocument();
    expect(within(timeline).getByText('Férias (aprovada)')).toBeInTheDocument();
    expect(within(timeline).getByText('Treinamento: Integração e Cultura Organizacional')).toBeInTheDocument();
    // 2020 (o ano mais antigo) começa recolhido — o evento dele não deve estar na tela.
    expect(within(timeline).queryByText('Admissão inicial')).not.toBeInTheDocument();
  });

  it('filters events with the search box (client-side, no new query)', async () => {
    renderComponent();
    const timeline = screen.getByTestId('history-timeline');
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Buscar no histórico...'), 'treinamento');

    expect(within(timeline).getByText('Treinamento: Integração e Cultura Organizacional')).toBeInTheDocument();
    expect(within(timeline).queryByText('Férias (aprovada)')).not.toBeInTheDocument();
  });

  it('shows a compact empty state with "Limpar filtros" when a search matches nothing', async () => {
    renderComponent();
    const timeline = screen.getByTestId('history-timeline');
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Buscar no histórico...'), 'evento-inexistente-xyz');

    expect(within(timeline).getByText('Nenhum evento encontrado para os filtros selecionados.')).toBeInTheDocument();
    await user.click(within(timeline).getByText('Limpar filtros'));
    expect(within(screen.getByTestId('history-timeline')).getByText('Férias (aprovada)')).toBeInTheDocument();
  });

  it('renders the "Tipos de eventos" sidebar summary with real counts only', () => {
    renderComponent();
    const sidebar = screen.getByText('Tipos de eventos').closest('div')!.parentElement!;
    expect(within(sidebar).getByText('Férias')).toBeInTheDocument();
    expect(within(sidebar).queryByText('Auditoria')).not.toBeInTheDocument();
  });

  it('shows a compact empty state when there are no events at all', () => {
    mockUseHistoricoColaborador.mockReturnValue({
      events: [], isLoading: false, colaborador: null,
      criarSalario: vi.fn(), criandoSalario: false, criarContrato: vi.fn(), excluirContrato: vi.fn(),
    });
    renderComponent();
    expect(screen.getByText('Nenhum evento no histórico')).toBeInTheDocument();
  });
});
