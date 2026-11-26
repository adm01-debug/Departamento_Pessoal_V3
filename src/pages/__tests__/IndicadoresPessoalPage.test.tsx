import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import IndicadoresPessoalPage from '@/pages/IndicadoresPessoalPage';

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtualId: 'emp-1' }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: rpcMock } }));

const payload = {
  periodo: { dias: 90, meses: 12, corte: '2026-08-29', primeiro_mes: '2025-12' },
  turnover_mensal: [
    {
      mes: '2026-10',
      admissoes: 2,
      desligamentos: 1,
      movimentacao: 3,
      efetivo_inicio: 10,
      efetivo_fim: 11,
      turnover_pct: 4.2,
    },
    {
      mes: '2026-11',
      admissoes: 1,
      desligamentos: 0,
      movimentacao: 1,
      efetivo_inicio: 11,
      efetivo_fim: 12,
      turnover_pct: 8.3,
    },
  ],
  cadastros_diarios: [{ data: '2026-11-20', departamento: 'Financeiro', status: 'ativo', total: 3 }],
  cadastros_por_departamento: [
    { departamento: 'Financeiro', total: 7, ativos: 5, em_ferias: 1, afastados: 1, desligados: 0 },
  ],
  absenteismo: [
    {
      mes: '2026-11',
      tipo: 'Licença médica',
      total: 5,
      dias_totais: 42,
      media_dias: 8.4,
      em_andamento: 1,
      encerrados: 4,
    },
  ],
  ferias_saldo: [
    {
      colaborador_id: 'c1',
      nome: 'Ana Souza',
      departamento: 'Financeiro',
      admissao: '2019-03-01',
      saldo_dias: 45,
      anos_trabalhados: 7,
      gozos_12m: 0,
    },
  ],
  ferias_resumo: {
    colaboradores: 12,
    saldo_total_dias: 210,
    saldo_medio_dias: 17.5,
    acima_30_dias: 3,
    sem_gozo_12m: 2,
  },
  atualizacao: {
    disponivel: true,
    agenda: '0 5 * * *',
    ultima_execucao: '2026-11-26T08:00:00Z',
    ultimo_status: 'succeeded',
  },
};

const vazio = {
  periodo: { dias: 90, meses: 12, corte: '2026-08-29', primeiro_mes: '2025-12' },
  turnover_mensal: [],
  cadastros_diarios: [],
  cadastros_por_departamento: [],
  absenteismo: [],
  ferias_saldo: [],
  ferias_resumo: {
    colaboradores: 0,
    saldo_total_dias: 0,
    saldo_medio_dias: 0,
    acima_30_dias: 0,
    sem_gozo_12m: 0,
  },
  atualizacao: { disponivel: false },
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <IndicadoresPessoalPage />
        </QueryClientProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('IndicadoresPessoalPage', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: payload, error: null });
  });

  it('consulta o RPC com a empresa atual e a janela padrão', async () => {
    renderPage();

    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));
    expect(rpcMock).toHaveBeenCalledWith('get_indicadores_pessoal', {
      p_empresa_id: 'emp-1',
      p_dias: 90,
      p_meses: 12,
    });
  });

  it('renderiza os indicadores vindos do banco', async () => {
    renderPage();

    // O KPI só aparece depois que o payload chega (antes disso são skeletons).
    expect(await screen.findByText('Férias acima de 30 dias')).toBeInTheDocument();
    expect(screen.getByText('Efetivo e movimentação')).toBeInTheDocument();
    expect(screen.getByText('Turnover mensal (%)')).toBeInTheDocument();
    expect(screen.getByText('Afastamentos por tipo (12 meses)')).toBeInTheDocument();
    expect(screen.getByText('Cadastros por departamento')).toBeInTheDocument();

    // KPI de férias: valor vem de ferias_resumo.acima_30_dias e o detalhe do resumo.
    expect(screen.getByText('12 colaboradores · saldo médio 17.5 d')).toBeInTheDocument();

    // Saldo por colaborador e destaque de saldo acima de 30 dias.
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('45 dias')).toBeInTheDocument();

    // Departamento e o total de afastamentos do período.
    expect(screen.getByTestId('departamentos')).toHaveTextContent('Financeiro');
    expect(screen.getByText('42 dias corridos')).toBeInTheDocument();
  });

  it('exibe a última execução do refresh diário', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByTestId('atualizacao')).toHaveTextContent('Indicadores recalculados em'));
    expect(screen.getByTestId('atualizacao')).toHaveTextContent('0 5 * * *');
  });

  it('mostra estado vazio quando não há dados no período', async () => {
    rpcMock.mockResolvedValue({ data: vazio, error: null });
    renderPage();

    expect(await screen.findByText('Sem indicadores no período')).toBeInTheDocument();
  });

  it('mostra erro e permite tentar novamente', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: new Error('Sem acesso aos indicadores da empresa emp-1'),
    });
    renderPage();

    expect(await screen.findByText('Não foi possível carregar os indicadores')).toBeInTheDocument();
    expect(screen.getByText('Sem acesso aos indicadores da empresa emp-1')).toBeInTheDocument();

    rpcMock.mockResolvedValue({ data: payload, error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Férias acima de 30 dias')).toBeInTheDocument();
  });

  it('recarrega ao clicar em atualizar', async () => {
    renderPage();
    // Espera o payload: durante o fetch o botão de atualizar fica desabilitado.
    await screen.findByText('Férias acima de 30 dias');

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar indicadores' }));

    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2));
  });
});
