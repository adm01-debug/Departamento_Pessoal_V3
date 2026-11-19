import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CalculadoraRescisaoPage from '@/pages/CalculadoraRescisaoPage';
import { createQueryBuilder } from '@/test/supabaseMock';

/**
 * UX do import de colaborador, resgatada da PR #546 ("Muri", fechada sem
 * merge): a tela usava um `Select` de rolagem pura e, depois de importar o
 * colaborador errado, não havia como desfazer — os campos ficavam preenchidos
 * com os dados da pessoa errada num formulário de rescisão.
 */

const ATIVOS = [
  { id: 'c1', nome_completo: 'Ana Lima' },
  { id: 'c2', nome_completo: 'Bruno Costa' },
];

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useDataAccessLog', () => ({ useDataAccessLog: () => undefined }));
vi.mock('@/services/piiAccessLogService', () => ({ registrarAcessoPII: vi.fn(async () => undefined) }));
vi.mock('@/services/edgeFunctionsService', () => ({ edgeFunctionsService: { calcularRescisao: vi.fn() } }));
vi.mock('@/utils/rescisaoPDF', () => ({
  gerarPDFRescisao: vi.fn(),
  formatarMomentoCalculo: () => 'não registrado',
  LABEL_ORIGEM_CALCULO: { local: 'Local (navegador)', servidor: 'Servidor (edge)' },
}));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((tabela: string) => {
      if (tabela !== 'colaboradores') return createQueryBuilder({ data: [], error: null });
      return createQueryBuilder({ data: ATIVOS, error: null });
    }),
  },
}));

function renderPagina() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CalculadoraRescisaoPage />
    </QueryClientProvider>
  );
}

// jsdom nao implementa scrollIntoView, e o cmdk chama isso ao montar a lista.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('CalculadoraRescisaoPage — importar colaborador', () => {
  it('o seletor é um combobox com busca, não uma lista de rolagem', async () => {
    renderPagina();
    const gatilho = (await screen.findByText(/selecione para preencher/i)).closest('button')!;
    await userEvent.click(gatilho);
    expect(await screen.findByPlaceholderText(/buscar por nome/i)).toBeInTheDocument();
  });

  it('a busca filtra a lista pelo nome digitado', async () => {
    renderPagina();
    await userEvent.click((await screen.findByText(/selecione para preencher/i)).closest('button')!);
    await userEvent.type(await screen.findByPlaceholderText(/buscar por nome/i), 'Bruno');
    await waitFor(() => {
      expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
      expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument();
    });
  });

  it('não oferece o botão de remover antes de importar alguém', async () => {
    renderPagina();
    await screen.findByText(/selecione para preencher/i);
    expect(screen.queryByRole('button', { name: /remover colaborador importado/i })).not.toBeInTheDocument();
  });
});
