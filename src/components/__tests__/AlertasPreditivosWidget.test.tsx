import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertasPreditivosWidget } from '@/components/dashboard/analytics/AlertasPreditivosWidget';
import type { RespostaAlertasPreditivos } from '@/hooks/useAlertasPreditivos';

// A edge `alertas-preditivos` estava publicada em producao e nenhum arquivo do
// `src` a invocava. Estes casos provam a porta de entrada: o gate de papel, o
// gate de empresa consolidada, o disparo manual (a edge grava em
// `notificacoes`, logo nao pode rodar no carregamento) e os quatro estados.

const { mockMutate, mockUseAlertasPreditivos, mockUseAuth, mockUseEmpresaStore } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockUseAlertasPreditivos: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseEmpresaStore: vi.fn(),
}));

vi.mock('@/hooks/useAlertasPreditivos', () => ({
  useAlertasPreditivos: mockUseAlertasPreditivos,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresaStore: mockUseEmpresaStore }));

type EstadoMutation = {
  mutate?: typeof mockMutate;
  isPending?: boolean;
  isError?: boolean;
  error?: Error | null;
  data?: RespostaAlertasPreditivos | undefined;
};

function comMutation(estado: EstadoMutation = {}) {
  mockUseAlertasPreditivos.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...estado,
  });
}

const EMPRESA = '11111111-1111-1111-1111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ isAdmin: false, hasRole: (r: string) => r === 'rh' });
  mockUseEmpresaStore.mockReturnValue({ empresaAtualId: EMPRESA, modo: 'individual' });
  comMutation();
});

describe('AlertasPreditivosWidget', () => {
  it('nega a análise para quem não é RH nem admin', () => {
    mockUseAuth.mockReturnValue({ isAdmin: false, hasRole: () => false });
    render(<AlertasPreditivosWidget />);
    expect(screen.getByTestId('preditivos-sem-permissao')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /analisar/i })).not.toBeInTheDocument();
  });

  it('libera para admin mesmo sem o papel de rh', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, hasRole: () => false });
    render(<AlertasPreditivosWidget />);
    expect(screen.queryByTestId('preditivos-sem-permissao')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analisar/i })).toBeInTheDocument();
  });

  it('pede uma empresa específica quando está no modo consolidado', () => {
    mockUseEmpresaStore.mockReturnValue({ empresaAtualId: EMPRESA, modo: 'consolidado' });
    render(<AlertasPreditivosWidget />);
    expect(screen.getByTestId('preditivos-sem-empresa')).toBeInTheDocument();
  });

  it('NÃO dispara a análise sozinho ao montar — a edge grava em notificacoes', () => {
    render(<AlertasPreditivosWidget />);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('dispara com a empresa atual quando o usuário clica', async () => {
    render(<AlertasPreditivosWidget />);
    await userEvent.click(screen.getByRole('button', { name: /analisar/i }));
    expect(mockMutate).toHaveBeenCalledWith({ empresaId: EMPRESA });
  });

  it('mostra carregando e desabilita o botão durante a análise', () => {
    comMutation({ isPending: true });
    render(<AlertasPreditivosWidget />);
    expect(screen.getByTestId('preditivos-carregando')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analisando/i })).toBeDisabled();
  });

  it('mostra o erro real da edge em vez de falhar calado', () => {
    comMutation({ isError: true, error: new Error('Edge Function returned 403') });
    render(<AlertasPreditivosWidget />);
    expect(screen.getByTestId('preditivos-erro')).toBeInTheDocument();
    expect(screen.getByText(/Edge Function returned 403/)).toBeInTheDocument();
  });

  it('trata a resposta sem_colaboradores como vazio, não como erro', () => {
    comMutation({
      data: { empresaId: EMPRESA, mode: 'both', status: 'sem_colaboradores' },
    });
    render(<AlertasPreditivosWidget />);
    expect(screen.getByTestId('preditivos-sem-colaboradores')).toBeInTheDocument();
    expect(screen.queryByTestId('preditivos-erro')).not.toBeInTheDocument();
  });

  it('diz que não há risco quando a edge analisa e não encontra sinal', () => {
    comMutation({
      data: {
        empresaId: EMPRESA,
        mode: 'both',
        totalColaboradores: 12,
        alertasTurnover: [],
        alertasAbsenteismo: [],
        totalAlertas: 0,
        alertasCriticos: 0,
      },
    });
    render(<AlertasPreditivosWidget />);
    expect(screen.getByTestId('preditivos-vazio')).toBeInTheDocument();
    expect(screen.getByText(/12 colaborador/)).toBeInTheDocument();
  });

  it('lista os sinais, o contador de urgentes e a rotatividade', () => {
    comMutation({
      data: {
        empresaId: EMPRESA,
        mode: 'both',
        totalColaboradores: 30,
        turnoverRate3m: 14,
        alertasTurnover: [
          {
            colaboradorId: 'c1',
            nome: 'Maria Oliveira',
            sinal: 'queda_frequencia',
            nivel: 'critica',
            justificativa: 'Ausências 40% acima do histórico nos últimos 3 meses',
            metrica: 40,
          },
        ],
        alertasAbsenteismo: [
          {
            colaboradorId: 'c2',
            nome: 'João Pereira',
            sinal: 'faltas_frequentes',
            nivel: 'media',
            justificativa: '4 falta(s) nos últimos 60 dias — acima do limiar de 3',
            metrica: 4,
          },
        ],
        totalAlertas: 2,
        alertasCriticos: 1,
      },
    });
    render(<AlertasPreditivosWidget />);
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
    expect(screen.getByText('João Pereira')).toBeInTheDocument();
    expect(screen.getByText(/Ausências 40% acima/)).toBeInTheDocument();
    expect(screen.getByTestId('preditivos-total')).toHaveTextContent('2');
    expect(screen.getByTestId('preditivos-criticos')).toHaveTextContent('1');
    expect(screen.getByTestId('preditivos-turnover-rate')).toHaveTextContent('14%');
  });

  it('ordena os críticos antes dos médios', () => {
    comMutation({
      data: {
        empresaId: EMPRESA,
        mode: 'both',
        totalColaboradores: 3,
        alertasTurnover: [
          {
            colaboradorId: 'c-media',
            nome: 'Medio Primeiro',
            sinal: 's',
            nivel: 'media',
            justificativa: 'sinal medio',
            metrica: 1,
          },
          {
            colaboradorId: 'c-critica',
            nome: 'Critico Depois',
            sinal: 's',
            nivel: 'critica',
            justificativa: 'sinal critico',
            metrica: 9,
          },
        ],
        alertasAbsenteismo: [],
        totalAlertas: 2,
        alertasCriticos: 1,
      },
    });
    render(<AlertasPreditivosWidget />);
    const itens = screen.getAllByRole('listitem');
    expect(itens[0]).toHaveTextContent('Critico Depois');
    expect(itens[1]).toHaveTextContent('Medio Primeiro');
  });

  it('exibe o resumo da IA quando a edge devolve um', () => {
    comMutation({
      data: {
        empresaId: EMPRESA,
        mode: 'both',
        totalColaboradores: 5,
        alertasTurnover: [
          {
            colaboradorId: 'c1',
            nome: 'Alguem',
            sinal: 's',
            nivel: 'alta',
            justificativa: 'j',
            metrica: 1,
          },
        ],
        alertasAbsenteismo: [],
        totalAlertas: 1,
        alertasCriticos: 1,
        iaResumo: 'Concentração de risco no setor de produção.',
      },
    });
    render(<AlertasPreditivosWidget />);
    expect(screen.getByTestId('preditivos-resumo-ia')).toHaveTextContent('Concentração de risco no setor de produção.');
  });

  it('não exibe o bloco de resumo quando a IA não respondeu (fallback estatístico)', () => {
    comMutation({
      data: {
        empresaId: EMPRESA,
        mode: 'both',
        totalColaboradores: 5,
        alertasTurnover: [
          {
            colaboradorId: 'c1',
            nome: 'Alguem',
            sinal: 's',
            nivel: 'alta',
            justificativa: 'j',
            metrica: 1,
          },
        ],
        alertasAbsenteismo: [],
        totalAlertas: 1,
        alertasCriticos: 1,
        iaResumo: null,
      },
    });
    render(<AlertasPreditivosWidget />);
    expect(screen.queryByTestId('preditivos-resumo-ia')).not.toBeInTheDocument();
    expect(screen.getByText('Alguem')).toBeInTheDocument();
  });
});
