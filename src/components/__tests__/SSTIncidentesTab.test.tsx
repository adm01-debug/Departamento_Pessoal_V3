import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/contexts', () => ({
  useEmpresa: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

import { SSTIncidentesTab } from '../sst/SSTIncidentesTab';

describe('SSTIncidentesTab', () => {
  it('renders Acidentes com Afastamento KPI card', () => {
    render(<SSTIncidentesTab />);
    expect(screen.getByText('Acidentes com Afastamento')).toBeInTheDocument();
  });

  it('renders Incidentes este mês KPI card', () => {
    render(<SSTIncidentesTab />);
    expect(screen.getByText('Incidentes este mês')).toBeInTheDocument();
  });

  it('renders Dias sem acidentes KPI card', () => {
    render(<SSTIncidentesTab />);
    expect(screen.getByText('Dias sem acidentes')).toBeInTheDocument();
  });

  it('renders 425 days without accidents', () => {
    render(<SSTIncidentesTab />);
    expect(screen.getByText('425')).toBeInTheDocument();
  });

  it('renders Histórico de Ocorrências section title', () => {
    render(<SSTIncidentesTab />);
    expect(screen.getByText('Histórico de Ocorrências')).toBeInTheDocument();
  });

  it('renders Data table header', () => {
    render(<SSTIncidentesTab />);
    expect(screen.getByText('Data')).toBeInTheDocument();
  });

  it('renders Tipo table header', () => {
    render(<SSTIncidentesTab />);
    expect(screen.getByText('Tipo')).toBeInTheDocument();
  });

  it('renders Exportar CAT button', () => {
    render(<SSTIncidentesTab />);
    expect(screen.getByRole('button', { name: /Exportar CAT/i })).toBeInTheDocument();
  });
});
