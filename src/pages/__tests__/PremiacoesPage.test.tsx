import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PremiacoesPage from '@/pages/PremiacoesPage';
import { premiacoesService } from '@/services/premiacoesService';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), promise: vi.fn() } }));
vi.mock('@/hooks', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/utils/dateLocal', () => ({ todayLocalISO: () => '2026-11-12' }));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));
vi.mock('@/components/premiacoes/RewardsSimulator', () => ({ RewardsSimulator: () => null }));
vi.mock('@/components/premiacoes/RewardsApprovalHub', () => ({ RewardsApprovalHub: () => null }));
vi.mock('@/components/premiacoes/CampaignWizard', () => ({ CampaignWizard: () => null }));
vi.mock('@/services/premiacoesService', () => ({
  PERIODO_SEM_DATA: '__sem_data__',
  premiacoesService: { listarCampanhas: vi.fn(), listarPagamentos: vi.fn(), listarAuditoria: vi.fn() },
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
