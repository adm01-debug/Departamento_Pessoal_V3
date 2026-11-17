import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PremiacoesPage from '@/pages/PremiacoesPage';
import { premiacoesService } from '@/services/premiacoesService';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), promise: vi.fn() } }));
vi.mock('@/hooks', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
const { roles } = vi.hoisted(() => ({ roles: { atual: ['rh'] as string[] } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ hasRole: (r: string) => roles.atual.includes(r) }) }));
vi.mock('@/utils/dateLocal', () => ({ todayLocalISO: () => '2026-11-12' }));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));
vi.mock('@/components/premiacoes/RewardsSimulator', () => ({ RewardsSimulator: () => null }));
vi.mock('@/components/premiacoes/CampaignWizard', () => ({ CampaignWizard: () => null }));
vi.mock('@/components/premiacoes/PagamentosTab', () => ({ PagamentosTab: () => null }));
vi.mock('@/components/premiacoes/AuditoriaTab', () => ({ AuditoriaTab: () => null }));
vi.mock('@/services/premiacoesService', () => ({
  PERIODO_SEM_DATA: '__sem_data__',
  premiacoesService: {
    listarCampanhas: vi.fn(),
    listarPagamentos: vi.fn(),
    listarAuditoria: vi.fn(),
    lancarRascunhoCampanha: vi.fn(),
    excluirRascunhoCampanha: vi.fn(),
  },
}));

const pag = (colaborador_id: string, status: string, data_pagamento: string, valor_aprovado: number) => ({
  id: `${colaborador_id}-${data_pagamento}`,
  colaborador_id,
  status,
  data_pagamento,
  valor_aprovado,
  valor_calculado: valor_aprovado,
  valor_folha_real: 0,
  status_conciliacao: null,
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PremiacoesPage />
    </QueryClientProvider>
  );
}

describe('PremiacoesPage — KPIs', () => {
  beforeEach(() => {
    vi.mocked(premiacoesService.listarCampanhas).mockResolvedValue([] as never);
    vi.mocked(premiacoesService.listarAuditoria).mockResolvedValue([] as never);
  });

  it('variação negativa usa cor destrutiva e premiados conta só pagos', async () => {
    vi.mocked(premiacoesService.listarPagamentos).mockResolvedValue([
      pag('c1', 'pago', '2026-10-05', 1000),
      pag('c2', 'pago', '2026-11-05', 600),
      pag('c3', 'calculado', '2026-11-06', 0),
    ] as never);

    renderPage();

    const variacao = await screen.findByText(/-40% vs mês anterior/);
    expect(variacao.className).toContain('text-destructive');
    expect(variacao.className).not.toContain('text-success');
    expect(screen.getByText('2 colaboradores premiados')).toBeInTheDocument();
  });

  it('variação positiva usa cor de sucesso', async () => {
    vi.mocked(premiacoesService.listarPagamentos).mockResolvedValue([
      pag('c1', 'pago', '2026-10-05', 1000),
      pag('c2', 'pago', '2026-11-05', 1500),
    ] as never);

    renderPage();

    const variacao = await screen.findByText(/\+50% vs mês anterior/);
    expect(variacao.className).toContain('text-success');
  });
});

const rascunho = {
  id: 'camp-r',
  nome: 'Campanha Rascunho',
  descricao: null,
  status: 'rascunho',
  data_inicio: '2026-10-01',
  data_fim: '2026-12-31',
  orcamento_estimado: 1000,
};

describe('PremiacoesPage — rascunhos', () => {
  beforeEach(() => {
    roles.atual = ['rh'];
    vi.mocked(premiacoesService.listarCampanhas).mockResolvedValue([rascunho] as never);
    vi.mocked(premiacoesService.listarPagamentos).mockResolvedValue([] as never);
    vi.mocked(premiacoesService.listarAuditoria).mockResolvedValue([] as never);
    vi.mocked(premiacoesService.lancarRascunhoCampanha)
      .mockReset()
      .mockResolvedValue({ id: 'camp-r' } as never);
    vi.mocked(premiacoesService.excluirRascunhoCampanha)
      .mockReset()
      .mockResolvedValue(undefined as never);
  });

  it('Lançar muda o rascunho para ativo', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Lançar' }));
    await waitFor(() => expect(premiacoesService.lancarRascunhoCampanha).toHaveBeenCalledWith('camp-r', 'emp-1'));
  });

  it('Excluir rascunho só apaga depois de confirmar', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir rascunho' }));
    expect(premiacoesService.excluirRascunhoCampanha).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(premiacoesService.excluirRascunhoCampanha).toHaveBeenCalledWith('camp-r', 'emp-1'));
  });

  it('sem papel RH/admin não mostra as ações do rascunho', async () => {
    roles.atual = ['user'];
    renderPage();
    expect(await screen.findByText('Campanha Rascunho')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lançar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir rascunho' })).not.toBeInTheDocument();
  });
});
