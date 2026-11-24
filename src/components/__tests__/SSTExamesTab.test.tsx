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
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

import { SSTExamesTab } from '../sst/SSTExamesTab';

const DEFAULT_PROPS = {
  asos: [],
  porTipo: [{ name: 'Admissional', value: 5 }],
  porDepartamento: [{ name: 'TI', value: 3 }],
  isLoading: false,
};

const MOCK_ASOS = [
  {
    id: 'aso-001',
    tipo: 'Admissional',
    data_exame: '2025-01-15',
    data_validade: '2027-01-15',
    medico_nome: 'Dr. Santos',
    colaborador: { nome_completo: 'João Silva' },
  },
];

describe('SSTExamesTab', () => {
  it('renders ASOs por Tipo chart title', () => {
    render(<SSTExamesTab {...DEFAULT_PROPS} />);
    expect(screen.getByText('ASOs por Tipo')).toBeInTheDocument();
  });

  it('renders ASOs por Departamento chart title', () => {
    render(<SSTExamesTab {...DEFAULT_PROPS} />);
    expect(screen.getByText('ASOs por Departamento')).toBeInTheDocument();
  });

  it('renders Colaborador table header', () => {
    render(<SSTExamesTab {...DEFAULT_PROPS} />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders Tipo table header', () => {
    render(<SSTExamesTab {...DEFAULT_PROPS} />);
    expect(screen.getByText('Tipo')).toBeInTheDocument();
  });

  it('shows empty state when no asos', () => {
    render(<SSTExamesTab {...DEFAULT_PROPS} />);
    expect(screen.getByText('Nenhum ASO cadastrado')).toBeInTheDocument();
  });

  it('renders colaborador name when asos provided', () => {
    render(<SSTExamesTab {...DEFAULT_PROPS} asos={MOCK_ASOS} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders Válido badge for non-expired ASO', () => {
    render(<SSTExamesTab {...DEFAULT_PROPS} asos={MOCK_ASOS} />);
    expect(screen.getByText('Válido')).toBeInTheDocument();
  });

  it('renders medico name in table row', () => {
    render(<SSTExamesTab {...DEFAULT_PROPS} asos={MOCK_ASOS} />);
    expect(screen.getByText('Dr. Santos')).toBeInTheDocument();
  });
});
