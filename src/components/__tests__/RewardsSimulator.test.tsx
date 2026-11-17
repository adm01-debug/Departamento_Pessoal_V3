import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  ComposedChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Bar: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
  LabelList: () => null,
  Legend: () => null,
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value }: { value?: number[] }) => <input type="range" defaultValue={value?.[0]} readOnly />,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() })),
  // `mutate` executa a mutationFn: é o que prova que Duplicar/Excluir chamam o serviço.
  useMutation: vi.fn((opcoes: { mutationFn: (entrada: never) => unknown }) => ({
    mutate: (entrada: never) => opcoes.mutationFn(entrada),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@/services/premiacoesService', () => ({
  premiacoesService: {
    listarCenariosROI: vi.fn().mockResolvedValue([]),
    salvarCenarioROI: vi.fn().mockResolvedValue({}),
    excluirCenariosROI: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/utils/format', () => ({
  formatCurrency: vi.fn((v: number) => `R$ ${v.toFixed(2)}`),
  formatDateTime: vi.fn((d: string) => d),
}));

import { useQuery } from '@tanstack/react-query';
import { premiacoesService } from '@/services/premiacoesService';
import { RewardsSimulator } from '../premiacoes/RewardsSimulator';

/** Cenário salvo tipado (baseline de `any` em teste é zero). */
interface CenarioSalvoDeTeste {
  id: string;
  nome: string;
  created_at: string;
  configuracoes: {
    employees: number;
    avgSalary: number;
    bonusPercent: number;
    performanceLevel: number;
    retentionImpact: number;
  };
  resultados: { totalBudget: number; savings: number; roi: number };
}

const CENARIO: CenarioSalvoDeTeste = {
  id: 'cen-001',
  nome: 'Cenário Agressivo',
  created_at: '2026-03-12T12:00:00.000Z',
  configuracoes: { employees: 80, avgSalary: 5000, bonusPercent: 12, performanceLevel: 90, retentionImpact: 6 },
  resultados: { totalBudget: 43200, savings: 10800, roi: 0.25 },
};

const comCenarios = (cenarios: CenarioSalvoDeTeste[]) =>
  vi.mocked(useQuery).mockReturnValue({ data: cenarios, isError: false, refetch: vi.fn() } as never);

describe('RewardsSimulator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    comCenarios([]);
  });

  it('renderiza as quatro regiões do redesenho', () => {
    render(<RewardsSimulator />);
    expect(screen.getByText(/Configure seu cenário/)).toBeInTheDocument();
    expect(screen.getByText(/Resultados da simulação/)).toBeInTheDocument();
    expect(screen.getByText(/Visualize o impacto/)).toBeInTheDocument();
    expect(screen.getByText(/Compare cenários/)).toBeInTheDocument();
    expect(screen.getByText(/Cenários salvos/)).toBeInTheDocument();
  });

  it('mantém os cinco parâmetros do simulador', () => {
    render(<RewardsSimulator />);
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
    expect(screen.getByText('Salário médio')).toBeInTheDocument();
    expect(screen.getByText('% Bônus-alvo')).toBeInTheDocument();
    expect(screen.getByText('Atingimento de meta')).toBeInTheDocument();
    expect(screen.getByText('Redução de turnover')).toBeInTheDocument();
  });

  it('exibe os quatro KPIs de resultado', () => {
    render(<RewardsSimulator />);
    expect(screen.getAllByText('Payout estimado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Economia estimada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Resultado líquido').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ROI estimado').length).toBeGreaterThan(0);
  });

  it('oferece os controles reais de cenário e salvamento', () => {
    render(<RewardsSimulator />);
    expect(screen.getByRole('combobox', { name: /Cenário de simulação/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar cenário/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Selecionar cenários \(0\)/i })).toBeInTheDocument();
  });

  it('mostra o estado vazio de comparação quando não há cenário selecionado', () => {
    render(<RewardsSimulator />);
    expect(screen.getByText(/Nenhum cenário selecionado/)).toBeInTheDocument();
  });

  it('não afirma ausência de cenário quando a leitura falha — oferece "Tentar novamente"', () => {
    const refetch = vi.fn();
    vi.mocked(useQuery).mockReturnValue({ data: [], isError: true, refetch } as never);
    render(<RewardsSimulator />);

    expect(screen.queryByText(/Nenhum cenário salvo ainda/)).toBeNull();
    expect(screen.getAllByText(/Não foi possível carregar os cenários salvos/).length).toBeGreaterThan(0);

    const botoes = screen.getAllByRole('button', { name: /Tentar novamente/i });
    fireEvent.click(botoes[0]);
    expect(refetch).toHaveBeenCalled();
  });

  it('duplica o cenário salvo pelo serviço, com o nome marcado como cópia', () => {
    comCenarios([CENARIO]);
    render(<RewardsSimulator />);

    fireEvent.click(screen.getByRole('button', { name: `Ações de ${CENARIO.nome}` }));
    fireEvent.click(screen.getByRole('button', { name: /Duplicar cenário/ }));

    expect(premiacoesService.salvarCenarioROI).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Cenário Agressivo (cópia)', employees: 80, totalBudget: 43200 }),
      'emp-001'
    );
  });

  it('exclui o cenário salvo pelo serviço, com o id do cenário', () => {
    comCenarios([CENARIO]);
    render(<RewardsSimulator />);

    fireEvent.click(screen.getByRole('button', { name: `Ações de ${CENARIO.nome}` }));
    fireEvent.click(screen.getByRole('button', { name: /Excluir cenário/ }));

    expect(premiacoesService.excluirCenariosROI).toHaveBeenCalledWith(['cen-001']);
  });

  it('mostra "—" no ROI do cenário salvo sem payout, nunca "0,00x"', () => {
    comCenarios([{ ...CENARIO, resultados: { totalBudget: 0, savings: 0, roi: 0 } }]);
    render(<RewardsSimulator />);

    expect(screen.queryByText(/ROI 0,00x/)).toBeNull();
    expect(screen.getAllByText(/ROI —/).length).toBeGreaterThan(0);
  });
});
