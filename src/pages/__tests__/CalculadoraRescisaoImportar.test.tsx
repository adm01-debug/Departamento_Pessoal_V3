import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CalculadoraRescisaoPage from '@/pages/CalculadoraRescisaoPage';
import { createQueryBuilder, type ChainableQuery } from '@/test/supabaseMock';

/**
 * UX do import de colaborador, resgatada da PR #546 ("Muri", fechada sem
 * merge): a tela usava um `Select` de rolagem pura e, depois de importar o
 * colaborador errado, não havia como desfazer — os campos ficavam preenchidos
 * com os dados da pessoa errada num formulário de rescisão.
 */

// Dois homônimos de propósito: é o caso que o nome sozinho não resolve, e errar
// a pessoa numa tela de rescisão gera homologação errada.
const ATIVOS = [
  { id: 'c1', nome_completo: 'José Silva', matricula: '1001', cpf_last4: '4321' },
  { id: 'c2', nome_completo: 'José Silva', matricula: '2002', cpf_last4: '8765' },
  { id: 'c3', nome_completo: 'Bruno Costa', matricula: null, cpf_last4: '1111' },
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

// Guarda os builders de `colaboradores` para poder asserir QUAIS colunas a tela
// pediu — a garantia de que o CPF inteiro não é carregado é o `select`, não a UI.
const buildersColaboradores: ChainableQuery[] = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((tabela: string) => {
      if (tabela !== 'colaboradores') return createQueryBuilder({ data: [], error: null });
      const builder = createQueryBuilder({ data: ATIVOS, error: null });
      buildersColaboradores.push(builder);
      return builder;
    }),
  },
}));

function colunasPedidasDeColaboradores(): string {
  const select = buildersColaboradores.flatMap((b) => b.__calls).find((c) => c.method === 'select');
  return String(select?.args[0] ?? '');
}

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
      expect(screen.queryByText('José Silva')).not.toBeInTheDocument();
    });
  });

  it('a busca aceita a matrícula e separa homônimos', async () => {
    renderPagina();
    await userEvent.click((await screen.findByText(/selecione para preencher/i)).closest('button')!);
    await userEvent.type(await screen.findByPlaceholderText(/buscar por nome/i), '2002');
    await waitFor(() => {
      // sobra só um dos dois "José Silva": o de matrícula 2002
      expect(screen.getAllByText('José Silva')).toHaveLength(1);
      expect(screen.getByText('2002')).toBeInTheDocument();
      expect(screen.queryByText('1001')).not.toBeInTheDocument();
      expect(screen.queryByText('Bruno Costa')).not.toBeInTheDocument();
    });
  });

  it('a busca aceita os 4 últimos dígitos do CPF', async () => {
    renderPagina();
    await userEvent.click((await screen.findByText(/selecione para preencher/i)).closest('button')!);
    await userEvent.type(await screen.findByPlaceholderText(/buscar por nome/i), '8765');
    await waitFor(() => {
      expect(screen.getAllByText('José Silva')).toHaveLength(1);
      expect(screen.getByText('2002')).toBeInTheDocument();
    });
  });

  it('a matrícula aparece na linha, o CPF completo nunca é carregado', async () => {
    renderPagina();
    await userEvent.click((await screen.findByText(/selecione para preencher/i)).closest('button')!);
    await screen.findByPlaceholderText(/buscar por nome/i);
    expect(screen.getByText('1001')).toBeInTheDocument();
    expect(screen.getByText('2002')).toBeInTheDocument();
    // a consulta pede cpf_last4, nunca cpf
    const colunas = colunasPedidasDeColaboradores();
    expect(colunas).toContain('cpf_last4');
    expect(colunas).not.toMatch(/(^|[\s,])cpf([\s,]|$)/);
  });

  it('não oferece o botão de remover antes de importar alguém', async () => {
    renderPagina();
    await screen.findByText(/selecione para preencher/i);
    expect(screen.queryByRole('button', { name: /remover colaborador importado/i })).not.toBeInTheDocument();
  });
});
