import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), promise: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/hooks/usePendencias', () => ({
  usePendencias: vi.fn(() => ({
    data: [],
    isLoading: false,
    updateStatus: { mutate: vi.fn(), mutateAsync: vi.fn() },
  })),
}));

vi.mock('@/hooks/usePontoMelhorado', () => ({
  usePontoMelhorado: vi.fn(() => ({
    solicitacoes: [],
    isLoading: false,
    responderSolicitacao: { mutate: vi.fn(), mutateAsync: vi.fn() },
  })),
}));

vi.mock('@/hooks/useRealTimeSubscription', () => ({
  useRealTimeSubscription: vi.fn(),
}));

vi.mock('@/services/tabelasComplementaresService', () => ({
  viewsService: { listar: vi.fn() },
}));

vi.mock('@/services/exportService', () => ({
  exportPortaria671PDF: vi.fn(),
  exportPontoCSV: vi.fn(),
}));

vi.mock('@/components/dashboard/analytics/widgets', () => ({
  MotionCard: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  donutColors: ['#000'],
  IndicatorRow: ({ label, value }: any) => <div>{label}: {value}</div>,
  QuickStat: ({ label, value }: any) => <div>{label}: {value}</div>,
  PendenciaItem: ({ pendencia }: any) => <div>{pendencia.titulo}</div>,
  AlertasRHWidget: () => <div data-testid="alertas-rh" />,
  CadastroIncompletoWidget: () => <div data-testid="cadastro-incompleto" />,
  ESocialMonitorWidget: () => <div data-testid="esocial-monitor">Monitor eSocial</div>,
}));

vi.mock('@/components/dashboard/MiniSparkline', () => ({
  MiniSparkline: () => <div data-testid="mini-sparkline" />,
}));

vi.mock('@/components/dashboard/AnimatedNumber', () => ({
  AnimatedNumber: ({ value }: any) => <span>{value}</span>,
}));

vi.mock('@/components/dashboard/BarChartWidget', () => ({
  BarChartWidget: () => <div data-testid="bar-chart" />,
}));

vi.mock('@/components/dashboard/DonutChart', () => ({
  DonutChart: () => <div data-testid="donut-chart" />,
}));

vi.mock('@/components/ui/module-skeleton', () => ({
  CardSkeleton: ({ className }: any) => <div data-testid="card-skeleton" className={className} />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: any) => <div role="menuitem">{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: () => <input type="checkbox" />,
}));

import { AnalyticsSection } from '../dashboard/AnalyticsSection';

const MOCK_STATS = {
  headcount: 42,
  admissoesMes: 3,
  demissoesMes: 1,
  turnover: 5.2,
  absenteismo: 2.1,
  departamentos: [{ nome: 'TI', count: 10 }],
  passivoTotal: 15000,
};

const DEFAULT_PROPS = {
  stats: MOCK_STATS,
  pendencias: [],
  isLoadingStats: false,
  isLoadingPendencias: false,
  isEmptySystem: false,
  empresaId: 'emp-1',
};

describe('AnalyticsSection', () => {
  it('renders Workflows quick access card', () => {
    render(<AnalyticsSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('Workflows')).toBeInTheDocument();
  });

  it('renders BI e Metas quick access card', () => {
    render(<AnalyticsSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('BI e Metas')).toBeInTheDocument();
  });

  it('renders Auditoria quick access card', () => {
    render(<AnalyticsSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('Auditoria')).toBeInTheDocument();
  });

  it('renders IA Insights quick access card', () => {
    render(<AnalyticsSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('IA Insights')).toBeInTheDocument();
  });

  it('renders Evolução Headcount card title', () => {
    render(<AnalyticsSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('Evolução Headcount')).toBeInTheDocument();
  });

  it('renders Notificações card', () => {
    render(<AnalyticsSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('Notificações')).toBeInTheDocument();
  });

  it('renders Sem notificações empty state', () => {
    render(<AnalyticsSection {...DEFAULT_PROPS} />);
    expect(screen.getByText('Sem notificações')).toBeInTheDocument();
  });

  it('renders Tudo em dia when pendencias empty', () => {
    render(<AnalyticsSection {...DEFAULT_PROPS} pendencias={[]} />);
    expect(screen.getByText('Tudo em dia!')).toBeInTheDocument();
  });
});
