import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/services/exportService', () => ({
  exportPontoCSV: vi.fn(),
  exportPontoPDF: vi.fn(),
}));

vi.mock('@/services/batidasPontoService', () => ({
  batidasPontoService: { list: vi.fn() },
}));

vi.mock('@/utils/dateLocal', () => ({
  formatDateLocalISO: (d: Date) => d.toISOString().split('T')[0],
  todayLocalISO: () => '2026-07-24',
}));

vi.mock('./PontoInconsistencyPanel', () => ({
  PontoInconsistencyPanel: () => <div data-testid="inconsistency-panel" />,
}));

vi.mock('./GestaoPontoAnalytics', () => ({
  GestaoPontoAnalytics: () => <div data-testid="analytics-panel" />,
}));

vi.mock('./PontoGeoAnalytics', () => ({
  PontoGeoAnalytics: () => <div data-testid="geo-analytics-panel" />,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button role="tab" data-value={value}>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => children,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: () => <input type="checkbox" />,
}));

import { useQuery } from '@tanstack/react-query';
import { GestaoRegistrosPonto } from '../ponto/GestaoRegistrosPonto';

const MOCK_REGISTROS = [
  { id: 'r1', data: '2026-07-24', colaborador: { nome_completo: 'João Silva', cargo: 'Analista', departamento: 'TI', foto_url: null }, entrada_1: '08:00', saida_1: '17:00', saida_intervalo: '12:00', retorno_intervalo: '13:00', horas_trabalhadas: '08:00', horas_extras: '00:00', atraso_minutos: 0 },
];

describe('GestaoRegistrosPonto', () => {
  it('renders Controle de Ponto title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByText(/Controle de Ponto/)).toBeInTheDocument();
  });

  it('renders Filtros Avançados button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByText('Filtros Avançados')).toBeInTheDocument();
  });

  it('renders search input', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument();
  });

  it('renders export buttons', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('renders colaborador name in table when data loaded', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_REGISTROS, isLoading: false } as any);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders table headers when data present', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_REGISTROS, isLoading: false } as any);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
    expect(screen.getByText('Trabalhadas')).toBeInTheDocument();
  });

  it('shows empty state when no registros', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByText(/Nenhum registro encontrado/)).toBeInTheDocument();
  });
});
