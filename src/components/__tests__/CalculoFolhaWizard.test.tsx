import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' }, empresaAtualId: 'emp-001' })),
}));

vi.mock('@/hooks/useFolhaAuditoria', () => ({
  useFolhaAuditoria: vi.fn(() => ({ registrarLog: vi.fn() })),
}));

vi.mock('@/hooks/useCalculoFolha', () => ({
  useCalculoFolha: vi.fn(() => ({
    executarCalculo: vi.fn(),
    executarCalculoLote: vi.fn(),
    isCalculando: false,
    progressoLote: 0,
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/components/folha/FolhaComposicao', () => ({
  FolhaComposicao: () => <div data-testid="folha-composicao" />,
}));

vi.mock('@/services/edgeFunctionsService', () => ({
  edgeFunctionsService: { calcularFolha: vi.fn() },
}));

vi.mock('@/services/tabelas/folhaService', () => ({
  rubricasFolhaService: { listar: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/validators/esocial', () => ({
  validarRubricaESocial: vi.fn(() => []),
}));

vi.mock('@/services/folhaPagamentoService', () => ({
  folhaPagamentoService: { obterOuCriarFolha: vi.fn() },
}));

vi.mock('@/utils/folhaCalc', () => ({
  folhaCalc: { calcular: vi.fn() },
}));

vi.mock('@/services/cnabService', () => ({
  cnabService: { gerarArquivo: vi.fn() },
}));

vi.mock('@/calculators/auditHelper', () => ({
  auditCalculation: vi.fn(),
}));

vi.mock('@/utils/dateLocal', () => ({
  formatDateLocalISO: vi.fn(() => '2026-07-24'),
}));

vi.mock('@/utils/safeUrl', () => ({
  safeHref: vi.fn((url: string) => url),
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any) => String(e)),
}));

import { CalculoFolhaWizard } from '../folha/CalculoFolhaWizard';

describe('CalculoFolhaWizard', () => {
  it('renders Assistente de Cálculo trigger button', () => {
    render(<CalculoFolhaWizard competencia="2026-07" />);
    expect(screen.getByRole('button', { name: /Assistente de Cálculo/i })).toBeInTheDocument();
  });

  it('renders Assistente de Folha dialog title', () => {
    render(<CalculoFolhaWizard competencia="2026-07" />);
    expect(screen.getByText('Assistente de Folha')).toBeInTheDocument();
  });

  it('renders competencia in dialog header', () => {
    render(<CalculoFolhaWizard competencia="2026-07" />);
    expect(screen.getByText(/Competência 2026-07/)).toBeInTheDocument();
  });

  it('renders Consistência step label', () => {
    render(<CalculoFolhaWizard competencia="2026-07" />);
    expect(screen.getByText('Consistência')).toBeInTheDocument();
  });

  it('renders Lançamentos step label', () => {
    render(<CalculoFolhaWizard competencia="2026-07" />);
    expect(screen.getByText('Lançamentos')).toBeInTheDocument();
  });

  it('renders Processamento step label', () => {
    render(<CalculoFolhaWizard competencia="2026-07" />);
    expect(screen.getByText('Processamento')).toBeInTheDocument();
  });

  it('renders Conclusão step label', () => {
    render(<CalculoFolhaWizard competencia="2026-07" />);
    expect(screen.getByText('Conclusão')).toBeInTheDocument();
  });

  it('renders Prosseguir button in step 1', () => {
    render(<CalculoFolhaWizard competencia="2026-07" />);
    expect(screen.getByRole('button', { name: /Prosseguir/i })).toBeInTheDocument();
  });
});
