import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const { invalidateQueries, updateChain } = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  updateChain: {
    update: vi.fn(),
    in: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useQueryClient: () => ({ invalidateQueries }),
  useMutation: (opts: {
    mutationFn: (v: string[]) => Promise<number>;
    onSuccess?: (r: number, v: string[]) => void;
    onError?: (e: unknown) => void;
  }) => ({
    isPending: false,
    mutate: (v: string[]) => {
      opts.mutationFn(v).then(
        (r) => opts.onSuccess?.(r, v),
        (e) => opts.onError?.(e)
      );
    },
  }),
}));

vi.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../ponto/PontoAuditTimeline', () => ({
  PontoAuditTimeline: ({ filterTabela, registroId }: { filterTabela?: string; registroId?: string }) => (
    <div data-testid="audit-timeline">{`${filterTabela}:${registroId}`}</div>
  ),
}));

vi.mock('@/hooks', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => updateChain),
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

vi.mock('../ponto/PontoInconsistencyPanel', () => ({
  PontoInconsistencyPanel: () => <div data-testid="inconsistency-panel" />,
}));

vi.mock('./GestaoPontoAnalytics', () => ({
  GestaoPontoAnalytics: () => <div data-testid="analytics-panel" />,
}));

vi.mock('./PontoGeoAnalytics', () => ({
  PontoGeoAnalytics: () => <div data-testid="geo-analytics-panel" />,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children?: ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <button role="tab" data-value={value}>
      {children}
    </button>
  ),
  TabsContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: ReactNode }) => children,
  PopoverContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: () => <input type="checkbox" />,
}));

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { GestaoRegistrosPonto } from '../ponto/GestaoRegistrosPonto';

const MOCK_REGISTROS = [
  {
    id: 'r1',
    data: '2026-07-24',
    colaborador: { nome_completo: 'João Silva', cargo: 'Analista', departamento: 'TI', foto_url: null },
    entrada_1: '08:00',
    saida_1: '17:00',
    saida_intervalo: '12:00',
    retorno_intervalo: '13:00',
    horas_trabalhadas: '08:00',
    horas_extras: '00:00',
    atraso_minutos: 0,
  },
];

describe('GestaoRegistrosPonto', () => {
  it('renders Controle de Ponto title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByText(/Controle de Ponto/)).toBeInTheDocument();
  });

  it('renders Filtros Avançados button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByText('Filtros Avançados')).toBeInTheDocument();
  });

  it('renders search input', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument();
  });

  it('renders export buttons', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('renders colaborador name in table when data loaded', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_REGISTROS, isLoading: false } as never);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders table headers when data present', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_REGISTROS, isLoading: false } as never);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
    expect(screen.getByText('Trabalhadas')).toBeInTheDocument();
  });

  it('renders the (mocked) inconsistency panel when data present', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_REGISTROS, isLoading: false } as never);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByTestId('inconsistency-panel')).toBeInTheDocument();
  });

  it('shows empty state when no registros', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<GestaoRegistrosPonto />);
    expect(screen.getByText(/Nenhum registro encontrado/)).toBeInTheDocument();
  });

  describe('ações', () => {
    const prepararUpdate = (resultado: { data: { id: string }[] | null; error: unknown }) => {
      updateChain.update.mockReturnValue(updateChain);
      updateChain.in.mockReturnValue(updateChain);
      updateChain.eq.mockReturnValue(updateChain);
      updateChain.select.mockResolvedValue(resultado);
    };

    const selecionarPrimeiro = () => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
    };

    it('Aprovar Lote grava aprovado/aprovado_por/aprovado_em nos registros selecionados', async () => {
      vi.mocked(useQuery).mockReturnValue({ data: MOCK_REGISTROS, isLoading: false } as never);
      prepararUpdate({ data: [{ id: 'r1' }], error: null });
      render(<GestaoRegistrosPonto />);
      selecionarPrimeiro();
      fireEvent.click(screen.getByText('Aprovar Lote'));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('1 registros aprovados em lote!'));
      expect(supabase.from).toHaveBeenCalledWith('registros_ponto');
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ aprovado: true, aprovado_por: 'user-1', aprovado_em: expect.any(String) })
      );
      expect(updateChain.in).toHaveBeenCalledWith('id', ['r1']);
      expect(updateChain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
      expect(updateChain.select).toHaveBeenCalledWith('id');
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['gestao-registros-ponto'] });
    });

    it('Aprovar Lote mostra erro quando nenhuma linha é atualizada (RLS)', async () => {
      vi.mocked(useQuery).mockReturnValue({ data: MOCK_REGISTROS, isLoading: false } as never);
      prepararUpdate({ data: [], error: null });
      render(<GestaoRegistrosPonto />);
      selecionarPrimeiro();
      fireEvent.click(screen.getByText('Aprovar Lote'));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Nenhum registro foi aprovado'))
      );
    });

    it('Histórico abre a trilha de auditoria filtrada pelo registro', () => {
      vi.mocked(useQuery).mockReturnValue({ data: MOCK_REGISTROS, isLoading: false } as never);
      render(<GestaoRegistrosPonto />);
      fireEvent.click(screen.getByRole('button', { name: 'Histórico' }));

      expect(screen.getByTestId('audit-timeline')).toHaveTextContent('registros_ponto:r1');
    });
  });
});
