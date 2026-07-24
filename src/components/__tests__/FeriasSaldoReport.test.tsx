import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks', () => ({
  useColaboradores: vi.fn(() => ({ colaboradores: [], isLoading: false })),
  usePeriodosAquisitivos: vi.fn(() => ({ periodos: [], isLoading: false })),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div data-testid="progress" data-value={value} />,
}));

import { FeriasSaldoReport } from '../ferias/FeriasSaldoReport';

const MOCK_COLABORADORES = [
  {
    id: 'col-001',
    nome_completo: 'João Silva',
    departamento: { nome: 'TI' },
  },
  {
    id: 'col-002',
    nome_completo: 'Maria Souza',
    departamento: { nome: 'RH' },
  },
];

describe('FeriasSaldoReport', () => {
  it('renders Saldo de Férias por Colaborador title', () => {
    render(<FeriasSaldoReport />);
    expect(screen.getByText(/Saldo de F.*rias por Colaborador/i)).toBeInTheDocument();
  });

  it('renders table header Colaborador', () => {
    render(<FeriasSaldoReport />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders table header Dias Disponíveis', () => {
    render(<FeriasSaldoReport />);
    expect(screen.getByText(/Dias Dispon.*veis/i)).toBeInTheDocument();
  });

  it('renders table header Progresso', () => {
    render(<FeriasSaldoReport />);
    expect(screen.getByText('Progresso')).toBeInTheDocument();
  });

  it('renders table header Status', () => {
    render(<FeriasSaldoReport />);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows skeleton when loading', async () => {
    const { useColaboradores } = await import('@/hooks');
    vi.mocked(useColaboradores).mockReturnValueOnce({ colaboradores: [], isLoading: true } as any);
    render(<FeriasSaldoReport />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders colaborador name when data provided', async () => {
    const { useColaboradores } = await import('@/hooks');
    vi.mocked(useColaboradores).mockReturnValueOnce({ colaboradores: MOCK_COLABORADORES, isLoading: false } as any);
    render(<FeriasSaldoReport />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders departamento name when data provided', async () => {
    const { useColaboradores } = await import('@/hooks');
    vi.mocked(useColaboradores).mockReturnValueOnce({ colaboradores: MOCK_COLABORADORES, isLoading: false } as any);
    render(<FeriasSaldoReport />);
    expect(screen.getByText('TI')).toBeInTheDocument();
  });
});
