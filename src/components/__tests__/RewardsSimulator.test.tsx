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
  it('renders Simulador de ROI title', () => {
    render(<RewardsSimulator />);
    expect(screen.getByText(/Simulador de ROI de Capital Humano/i)).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    render(<RewardsSimulator />);
    expect(screen.getByText(/Projete e compare cen.*rios/i)).toBeInTheDocument();
  });

  it('renders Comparar Cenários button', () => {
    render(<RewardsSimulator />);
    expect(screen.getByRole('button', { name: /Comparar Cen.*rios/i })).toBeInTheDocument();
  });

  it('renders Resetar button', () => {
    render(<RewardsSimulator />);
    expect(screen.getByRole('button', { name: /Resetar/i })).toBeInTheDocument();
  });

  it('renders Salvar Snapshot button', () => {
    render(<RewardsSimulator />);
    expect(screen.getByRole('button', { name: /Salvar Snapshot/i })).toBeInTheDocument();
  });

  it('renders Colaboradores slider label', () => {
    render(<RewardsSimulator />);
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
  });

  it('renders Salário Médio slider label', () => {
    render(<RewardsSimulator />);
    expect(screen.getByText(/Sal.*rio M.*dio/i)).toBeInTheDocument();
  });

  it('renders Snapshots Auditoria section', () => {
    render(<RewardsSimulator />);
    expect(screen.getByText(/Snapshots.*Auditoria/i)).toBeInTheDocument();
  });
});
