import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { UseQueryOptions } from '@tanstack/react-query';

const state = vi.hoisted(() => ({
  pendingPoints: 0 as number,
  pontoCount: 0 as number,
  lote: vi.fn(async () => ({ success: 5 })),
  progressoLote: null as { current: number; total: number; success: number } | null,
  rubricas: [{ id: 'r1' }] as unknown[],
  validarRubrica: vi.fn((_r: unknown) => ({ valid: true })),
  folhaItens: {
    data: [
      {
        folha_id: 'folha-1',
        detalhes: { proventos: 100, descontos: 20, inss: 10, irrf: 5, fgts: 8 },
      },
    ],
    error: null,
  } as { data: unknown[]; error: null },
  auditoriaInsert: vi.fn(async () => ({ error: null })),
  emitirPDF: vi.fn(async (_id: string) => 'https://example.com/holerite.pdf'),
  cnab: vi.fn(async (_emp: string, _folha: string) => 'CNAB-CONTENT'),
  invalidateQueries: vi.fn(),
  queries: [] as UseQueryOptions[],
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
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
    executarCalculoLote: state.lote,
    isCalculando: false,
    progressoLote: state.progressoLote,
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((opts: UseQueryOptions) => {
    state.queries.push(opts);
    return { data: state.pendingPoints, isLoading: false };
  }),
  useQueryClient: vi.fn(() => ({ invalidateQueries: state.invalidateQueries })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        gte: () => builder,
        lte: () => builder,
        limit: () => Promise.resolve(state.folhaItens),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        insert: state.auditoriaInsert,
        then: (onFulfilled: unknown, onRejected: unknown) =>
          Promise.resolve({ count: state.pontoCount, data: null, error: null }).then(
            onFulfilled as never,
            onRejected as never
          ),
      };
      return builder;
    }),
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => children,
}));

vi.mock('@/components/folha/FolhaComposicao', () => ({
  FolhaComposicao: () => <div data-testid="folha-composicao" />,
}));

vi.mock('@/services/tabelas/folhaService', () => ({
  rubricasFolhaService: { listar: vi.fn(async () => state.rubricas) },
}));

vi.mock('@/schemas/esocial', () => ({
  validarRubricaESocial: (r: unknown) => state.validarRubrica(r),
}));

vi.mock('@/services/folhaPagamentoService', () => ({
  folhaPagamentoService: { emitirPDF: (id: string) => state.emitirPDF(id) },
}));

vi.mock('@/services/cnabService', () => ({
  cnabService: { generateCNAB240: (emp: string, folha: string) => state.cnab(emp, folha) },
}));

vi.mock('@/services/loggerService', () => ({
  loggerService: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/utils/dateLocal', () => ({
  formatDateLocalISO: vi.fn(() => '2026-07-31'),
}));

vi.mock('@/utils/safeUrl', () => ({
  safeHref: vi.fn((url: string) => url),
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: unknown, d?: string) => d ?? String(e)),
}));

import { toast } from 'sonner';
import { CalculoFolhaWizard } from '../folha/CalculoFolhaWizard';

const COMPETENCIA = '07/2026';

function renderWizard(competencia = COMPETENCIA) {
  return render(<CalculoFolhaWizard competencia={competencia} />);
}

async function goToStep3() {
  fireEvent.click(screen.getByRole('button', { name: /Prosseguir/i }));
  fireEvent.click(screen.getByRole('button', { name: /Iniciar C.lculo/i }));
  await screen.findByText('Pronto para calcular?');
}

async function calculate() {
  await goToStep3();
  fireEvent.click(screen.getByRole('button', { name: /Confirmar e Calcular/i }));
  await screen.findByText('Cálculo Finalizado!');
}

describe('CalculoFolhaWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.pendingPoints = 0;
    state.pontoCount = 0;
    state.lote.mockResolvedValue({ success: 5 });
    state.progressoLote = null;
    state.rubricas = [{ id: 'r1' }];
    state.validarRubrica.mockReturnValue({ valid: true });
    state.folhaItens = {
      data: [{ folha_id: 'folha-1', detalhes: { proventos: 100, descontos: 20, inss: 10, irrf: 5, fgts: 8 } }],
      error: null,
    };
    state.queries = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Assistente de Cálculo trigger button', () => {
    renderWizard();
    expect(screen.getByRole('button', { name: /Assistente de Cálculo/i })).toBeInTheDocument();
  });

  it('renders Assistente de Folha dialog title', () => {
    renderWizard();
    expect(screen.getByText('Assistente de Folha')).toBeInTheDocument();
  });

  it('renders competencia in dialog header', () => {
    renderWizard();
    expect(screen.getByText(/Competência 07\/2026/)).toBeInTheDocument();
  });

  it('renders Consistência step label', () => {
    renderWizard();
    expect(screen.getByText('Consistência')).toBeInTheDocument();
  });

  it('renders Lançamentos step label', () => {
    renderWizard();
    expect(screen.getByText('Lançamentos')).toBeInTheDocument();
  });

  it('renders Processamento step label', () => {
    renderWizard();
    expect(screen.getByText('Processamento')).toBeInTheDocument();
  });

  it('renders Conclusão step label', () => {
    renderWizard();
    expect(screen.getByText('Conclusão')).toBeInTheDocument();
  });

  it('renders Prosseguir button in step 1', () => {
    renderWizard();
    expect(screen.getByRole('button', { name: /Prosseguir/i })).toBeInTheDocument();
  });

  it('step 1 mostra aprovação ok sem pendências e alerta com pendências', () => {
    const { rerender } = renderWizard();
    expect(screen.getByText('Todos os registros de ponto estão aprovados.')).toBeInTheDocument();
    state.pendingPoints = 3;
    rerender(<CalculoFolhaWizard competencia={COMPETENCIA} />);
    expect(screen.getByText('Existem 3 batidas aguardando aprovação.')).toBeInTheDocument();
  });

  it('queryFn de pending-points consulta registros_ponto e retorna count', async () => {
    state.pontoCount = 7;
    renderWizard();
    const query = state.queries.find((q) => (q.queryKey as string[])[0] === 'pending-points');
    const count = await (query!.queryFn as () => Promise<number>)();
    expect(count).toBe(7);
  });

  it('navega step1 → step2 → step3 e volta', async () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Prosseguir/i }));
    expect(screen.getByText('Verbas Variáveis e Eventos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Voltar/i }));
    expect(screen.getByRole('button', { name: /Prosseguir/i })).toBeInTheDocument();
    await goToStep3();
    fireEvent.click(screen.getByRole('button', { name: /Revisar/i }));
    expect(screen.getByText('Verbas Variáveis e Eventos')).toBeInTheDocument();
  });

  it('botões Cancelar/Concluir fecham o wizard', async () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    await calculate();
    fireEvent.click(screen.getByRole('button', { name: /^Concluir$/i }));
  });

  it('cálculo com sucesso chama lote, audita folha e vai para Conclusão', async () => {
    renderWizard();
    await calculate();
    expect(state.lote).toHaveBeenCalledWith({ empresaId: 'emp-001', competencia: '2026-07' });
    expect(toast.info).toHaveBeenCalledWith('Cálculo em lote concluído: 5 sucessos.');
    expect(state.auditoriaInsert).toHaveBeenCalledWith(
      expect.objectContaining({ folha_id: 'folha-1', tipo_evento: 'CALCULO', severidade: 'INFO' })
    );
    expect(state.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['folha-resumo', COMPETENCIA] });
    expect(screen.getByTestId('folha-composicao')).toBeInTheDocument();
  });

  it('rubrica inválida aborta com toast.error e não chama o lote', async () => {
    state.validarRubrica.mockReturnValue({ valid: false });
    renderWizard();
    await goToStep3();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar e Calcular/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(state.lote).not.toHaveBeenCalled();
    expect(screen.getByText('Pronto para calcular?')).toBeInTheDocument();
  });

  it('falha do lote mostra toast.error', async () => {
    state.lote.mockRejectedValueOnce(new Error('edge down'));
    renderWizard();
    await goToStep3();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar e Calcular/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByText('Cálculo Finalizado!')).not.toBeInTheDocument();
  });

  it('sem itens de folha conclui sem composição e botões de PDF/CNAB não disparam serviços', async () => {
    state.folhaItens = { data: [], error: null };
    renderWizard();
    await calculate();
    expect(screen.queryByTestId('folha-composicao')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Holerites \(PDF\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Arquivo CNAB/i }));
    await waitFor(() => {});
    expect(state.emitirPDF).not.toHaveBeenCalled();
    expect(state.cnab).not.toHaveBeenCalled();
  });

  it('botão Holerites (PDF) emite PDF e abre em nova aba', async () => {
    renderWizard();
    await calculate();
    fireEvent.click(screen.getByRole('button', { name: /Holerites \(PDF\)/i }));
    await waitFor(() => expect(state.emitirPDF).toHaveBeenCalledWith('folha-1'));
    expect(window.open).toHaveBeenCalledWith('https://example.com/holerite.pdf', '_blank', 'noopener');
  });

  it('erro ao emitir PDF mostra toast.error', async () => {
    state.emitirPDF.mockRejectedValueOnce(new Error('pdf fail'));
    renderWizard();
    await calculate();
    fireEvent.click(screen.getByRole('button', { name: /Holerites \(PDF\)/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it('botão Arquivo CNAB gera e baixa o arquivo', async () => {
    renderWizard();
    await calculate();
    fireEvent.click(screen.getByRole('button', { name: /Arquivo CNAB/i }));
    await waitFor(() => expect(state.cnab).toHaveBeenCalledWith('emp-001', 'folha-1'));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Arquivo CNAB gerado com sucesso!'));
  });

  it('erro ao gerar CNAB mostra toast.error', async () => {
    state.cnab.mockRejectedValueOnce(new Error('cnab fail'));
    renderWizard();
    await calculate();
    fireEvent.click(screen.getByRole('button', { name: /Arquivo CNAB/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it('durante o processamento exibe spinner e progresso do lote', async () => {
    let resolver: (v: { success: number }) => void = () => {};
    state.lote.mockReturnValueOnce(new Promise<{ success: number }>((r) => (resolver = r)));
    state.progressoLote = { current: 2, total: 4, success: 2 };
    renderWizard();
    await goToStep3();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar e Calcular/i }));
    await screen.findByText('Processando Folha...');
    expect(screen.getByText(/2 de 4 \(2 sucessos\)/)).toBeInTheDocument();
    resolver({ success: 5 });
    await screen.findByText('Cálculo Finalizado!');
  });
});
