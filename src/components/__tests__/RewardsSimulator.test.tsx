import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
  LabelList: () => null,
  Legend: () => null,
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value }: any) => <input type="range" defaultValue={value?.[0]} readOnly />,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@/services/premiacoesService', () => ({
  premiacoesService: {
    listarCenariosROI: vi.fn().mockResolvedValue([]),
    salvarCenarioROI: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/format', () => ({
  formatCurrency: vi.fn((v: number) => `R$ ${v.toFixed(2)}`),
  formatDateTime: vi.fn((d: string) => d),
}));

import { RewardsSimulator } from '../premiacoes/RewardsSimulator';

describe('RewardsSimulator', () => {
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
});
