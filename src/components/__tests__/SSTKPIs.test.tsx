import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: 2, isLoading: false })),
}));

vi.mock('@/contexts', () => ({
  useEmpresa: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: 2, error: null }),
    })),
  },
}));

import { SSTKPIs } from '../sst/SSTKPIs';

const DEFAULT_PROPS = {
  validos: 25,
  vencendo: 5,
  vencidos: 2,
  totalEpis: 12,
  totalEntregas: 30,
};

describe('SSTKPIs', () => {
  it('renders ASOs Válidos KPI', () => {
    render(<SSTKPIs {...DEFAULT_PROPS} />);
    expect(screen.getByText('ASOs Válidos')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('renders Vencendo 30d KPI', () => {
    render(<SSTKPIs {...DEFAULT_PROPS} />);
    expect(screen.getByText('Vencendo 30d')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders Vencidos KPI', () => {
    render(<SSTKPIs {...DEFAULT_PROPS} vencidos={3} />);
    expect(screen.getByText('Vencidos')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders EPIs Ativos KPI', () => {
    render(<SSTKPIs {...DEFAULT_PROPS} />);
    expect(screen.getByText('EPIs Ativos')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders Incidentes KPI label', () => {
    render(<SSTKPIs {...DEFAULT_PROPS} />);
    expect(screen.getByText('Incidentes (Mês)')).toBeInTheDocument();
  });

  it('renders Índice de Conformidade SST section', () => {
    render(<SSTKPIs {...DEFAULT_PROPS} />);
    expect(screen.getByText('Índice de Conformidade SST')).toBeInTheDocument();
  });

  it('renders ESTÁVEL badge', () => {
    render(<SSTKPIs {...DEFAULT_PROPS} />);
    expect(screen.getByText('ESTÁVEL')).toBeInTheDocument();
  });

  it('renders Meta: 95% label', () => {
    render(<SSTKPIs {...DEFAULT_PROPS} />);
    expect(screen.getByText('Meta: 95%')).toBeInTheDocument();
  });
});
