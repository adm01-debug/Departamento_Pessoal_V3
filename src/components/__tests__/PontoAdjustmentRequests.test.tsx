/**
 * Central de Ajustes — conteúdo da aba Registros (Controle de Ponto).
 *
 * O teste exercita a TELA, não o banco: a query é substituída por um cenário
 * controlável (as solicitações que o componente receberia) e a mutation por um
 * espião, para conferir a fiação — filtro por status, painel de detalhes ao
 * clicar na linha, confirmação antes da escrita e a decisão que chega na
 * mutation com o id e o status certos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { addDaysLocal, formatDateLocalISO } from '@/utils/dateLocal';

/** Cenário mutável lido pelos mocks (hoisted para o `vi.mock`). */
const cenario = vi.hoisted(() => ({
  solicitacoes: [] as Record<string, unknown>[],
  mutate: vi.fn(),
  /** `true` = viewport largo (>= 1400px): painel de detalhes em coluna. */
  largo: true,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/hooks', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-001' } }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opcoes: { queryKey?: unknown[] }) => {
    const chave = String(opcoes?.queryKey?.[0] ?? '');
    if (chave === 'solicitacoes-ajuste-ponto') return { data: cenario.solicitacoes, isLoading: false };
    // Demais consultas (contexto de jornada, trilha de auditoria).
    return { data: [], isLoading: false };
  },
  useMutation: () => ({ mutate: cenario.mutate, mutateAsync: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: (erro: unknown) => String(erro),
}));

import { PontoAdjustmentRequests } from '../ponto/PontoAdjustmentRequests';

/** Data local deslocada em dias — mantém as linhas dentro do período de 30 dias. */
const dia = (offset: number) => formatDateLocalISO(addDaysLocal(new Date(), offset));

function solicitacoesDeExemplo() {
  return [
    {
      id: 'saj-1',
      colaborador_id: 'colab-1',
      colaborador: { nome_completo: 'Ana Beatriz Souza' },
      data_ponto: dia(-2),
      tipo_ponto: 'saida',
      hora_sugerida: '17:00',
      hora_original: null,
      motivo: 'Esqueci de registrar a saída do expediente.',
      status: 'pendente',
      relatorio_conformidade: {
        portaria_671_conformidade: true,
        divergencia_minutos: 0,
        ia_risco: { nivel: 'alto', resumo: 'Divergência relevante no histórico recente.' },
      },
    },
    {
      id: 'saj-2',
      colaborador_id: 'colab-2',
      colaborador: { nome_completo: 'Márcio Nunes' },
      data_ponto: dia(-4),
      tipo_ponto: 'entrada',
      hora_sugerida: '08:00',
      hora_original: '08:12',
      motivo: 'O relógio de ponto estava fora do ar.',
      status: 'pendente',
      relatorio_conformidade: {
        divergencia_minutos: 12,
        ia_risco: { nivel: 'medio', resumo: 'Compatível com a jornada.' },
      },
    },
    {
      id: 'saj-3',
      colaborador_id: 'colab-3',
      colaborador: { nome_completo: 'Bruno Lima' },
      data_ponto: dia(-9),
      tipo_ponto: 'saida_almoco',
      hora_sugerida: '12:00',
      hora_original: '12:05',
      motivo: 'A batida de saída para o almoço não foi gravada.',
      status: 'aprovado',
      observacoes_gestor: 'Conferido com a chefia imediata.',
      relatorio_conformidade: { divergencia_minutos: 5 },
    },
  ];
}

describe('Central de Ajustes (PontoAdjustmentRequests)', () => {
  beforeEach(() => {
    cenario.solicitacoes = solicitacoesDeExemplo();
    cenario.mutate.mockClear();
    cenario.largo = true;
    // O setup global devolve `matches: false` sempre; aqui o viewport é
    // controlável porque a tela troca o painel de coluna por um DRAWER na
    // quebra de 1400px.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: cenario.largo ? query.includes('1400') : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  it('renderiza o cabeçalho, a busca e o seletor de período', () => {
    render(<PontoAdjustmentRequests />);
    expect(screen.getByText('Central de Ajustes')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /buscar colaborador/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /período das solicitações/i })).toBeInTheDocument();
  });

  it('mostra os quatro KPIs do período', () => {
    render(<PontoAdjustmentRequests />);
    // A linha de apoio pode ganhar o sufixo "· sem variação" quando o período
    // anterior tem o MESMO número — por isso a asserção é por prefixo.
    expect(screen.getByText(/^aguardando análise do RH/)).toBeInTheDocument();
    expect(screen.getByText(/^ajustes aceitos/)).toBeInTheDocument();
    expect(screen.getByText(/^sem comprovação aceita/)).toBeInTheDocument();
    expect(screen.getByText(/^apontadas pela análise IA/)).toBeInTheDocument();
  });

  it('lista as solicitações na tabela com as colunas da referência', () => {
    render(<PontoAdjustmentRequests />);
    ['Colaborador', 'Data', 'Tipo de ajuste', 'Horário', 'Motivo', 'Risco IA', 'Status'].forEach((coluna) => {
      expect(screen.getByRole('columnheader', { name: coluna })).toBeInTheDocument();
    });
    expect(screen.getByText('Márcio Nunes')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–3 de 3')).toBeInTheDocument();
  });

  it('abre a primeira solicitação no painel de detalhes por padrão', () => {
    render(<PontoAdjustmentRequests />);
    expect(screen.getByText('Justificativa')).toBeInTheDocument();
    expect(screen.getByText('Análise de risco (IA)')).toBeInTheDocument();
    expect(screen.getByText('Contexto da jornada')).toBeInTheDocument();
    // A justificativa da primeira linha aparece na tabela e no painel.
    expect(screen.getAllByText('Esqueci de registrar a saída do expediente.')).toHaveLength(2);
  });

  it('troca o painel ao clicar em outra linha', () => {
    render(<PontoAdjustmentRequests />);
    fireEvent.click(screen.getByText('Bruno Lima'));
    expect(screen.getByText('Decisão registrada')).toBeInTheDocument();
    expect(screen.getByText('Conferido com a chefia imediata.')).toBeInTheDocument();
  });

  it('filtra pelo chip de status', () => {
    render(<PontoAdjustmentRequests />);
    fireEvent.click(screen.getByRole('button', { name: /Aprovadas/ }));
    expect(screen.queryByText('Márcio Nunes')).not.toBeInTheDocument();
    expect(screen.getAllByText('Bruno Lima').length).toBeGreaterThan(0);
    expect(screen.getByText('Mostrando 1–1 de 1')).toBeInTheDocument();
  });

  it('o rodapé traz a contagem de selecionadas e as ações em lote, sem perder o intervalo', () => {
    render(<PontoAdjustmentRequests />);

    // Sem seleção: só o intervalo real exibido + a paginação.
    expect(screen.getByText('Mostrando 1–3 de 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovar em lote' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Selecionar solicitação de Ana Beatriz Souza'));

    // Com seleção: a contagem REAL assume a esquerda do rodapé e as ações
    // aparecem — o intervalo continua ao lado da paginação (mesma faixa).
    expect(screen.getByText(/1 solicitação selecionada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprovar em lote' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejeitar em lote' })).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–3 de 3')).toBeInTheDocument();
  });

  it('pede confirmação antes de aprovar e só então chama a mutation', () => {
    render(<PontoAdjustmentRequests />);
    fireEvent.click(screen.getByRole('button', { name: /^Aprovar ajuste$/ }));

    // O diálogo diz QUEM está sendo decidido e nada foi gravado ainda.
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/Aprovar a solicitação de ajuste de Ana Beatriz Souza\?/)).toBeInTheDocument();
    expect(cenario.mutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^Aprovar$/ }));
    expect(cenario.mutate).toHaveBeenCalledWith({ id: 'saj-1', status: 'aprovado' });
  });

  it('não grava nada quando a confirmação é cancelada', () => {
    render(<PontoAdjustmentRequests />);
    fireEvent.click(screen.getByRole('button', { name: /^Rejeitar solicitação$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/ }));
    expect(cenario.mutate).not.toHaveBeenCalled();
  });

  it('rejeita pelo painel depois da confirmação, com o status recusado', () => {
    render(<PontoAdjustmentRequests />);
    fireEvent.click(screen.getByRole('button', { name: /^Rejeitar solicitação$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Rejeitar$/ }));
    expect(cenario.mutate).toHaveBeenCalledWith({ id: 'saj-1', status: 'recusado' });
  });

  it('em telas menores o painel abre como drawer ao clicar na linha', () => {
    cenario.largo = false;
    render(<PontoAdjustmentRequests />);

    // Sem clique não existe painel: a tabela usa a largura inteira.
    expect(screen.queryByText('Justificativa')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Bruno Lima'));
    expect(screen.getByText('Justificativa')).toBeInTheDocument();
    expect(screen.getByText('Conferido com a chefia imediata.')).toBeInTheDocument();
  });

  it('mostra o estado vazio quando não há solicitações no período', () => {
    cenario.solicitacoes = [];
    render(<PontoAdjustmentRequests />);
    expect(screen.getByText('Nenhuma solicitação encontrada')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma solicitação no período')).toBeInTheDocument();
    expect(screen.getByText('Selecione uma solicitação')).toBeInTheDocument();
  });
});
