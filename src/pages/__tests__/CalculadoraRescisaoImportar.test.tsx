import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
/** Builders de `desligamentos`, para asserir EM QUEM o desligamento foi gravado. */
const buildersDesligamentos: ChainableQuery[] = [];
/** Linha completa devolvida por `.select('*').eq('id', …).single()` ao importar. */
let colaboradorImportado: Record<string, unknown> | null = null;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((tabela: string) => {
      if (tabela === 'desligamentos') {
        const builder = createQueryBuilder({ data: null, error: null });
        buildersDesligamentos.push(builder);
        return builder;
      }
      if (tabela !== 'colaboradores') return createQueryBuilder({ data: [], error: null });
      // `.single()` do import precisa de UMA linha; a lista do seletor, do array.
      const builder = createQueryBuilder<unknown>({
        data: colaboradorImportado ?? ATIVOS,
        error: null,
      });
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

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * `Input type="date"` é o `DatePicker` do design system (`ui/input.tsx`): um
 * botão que abre o calendário, não um `<input type="date">`. Mesmo caminho do
 * helper já documentado em `src/components/__tests__/FeriasForm.test.tsx`.
 */
function selecionarData(rotulo: string, iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  fireEvent.click(screen.getByLabelText(rotulo));
  fireEvent.click(screen.getByRole('button', { name: /^[a-zç]+ \d{4}$/i }));
  fireEvent.click(screen.getByRole('button', { name: String(new Date().getFullYear()) }));
  fireEvent.click(screen.getByRole('button', { name: String(ano) }));
  fireEvent.click(screen.getByRole('button', { name: MESES_ABREV[mes - 1] }));
  const celula = screen
    .getAllByRole('gridcell', { name: String(dia) })
    .find((c) => !c.className.includes('day-outside'));
  fireEvent.click(celula!.querySelector('button')!);
}

// jsdom nao implementa scrollIntoView, e o cmdk chama isso ao montar a lista.
beforeEach(() => {
  buildersColaboradores.length = 0;
  buildersDesligamentos.length = 0;
  colaboradorImportado = null;
});

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

  it('o desligamento é gravado no homônimo ESCOLHIDO, não no primeiro da lista', async () => {
    renderPagina();
    await userEvent.click((await screen.findByText(/selecione para preencher/i)).closest('button')!);
    await userEvent.type(await screen.findByPlaceholderText(/buscar por nome/i), '2002');

    // A partir daqui o `.single()` do import devolve a linha do SEGUNDO José Silva.
    colaboradorImportado = {
      id: 'c2',
      nome_completo: 'José Silva',
      cpf: '00000000000',
      cargo: 'Analista',
      salario_base: 3000,
      data_admissao: '2024-01-10',
    };
    await userEvent.click(await screen.findByText('2002'));

    const nome = await screen.findByPlaceholderText('Nome completo');
    await waitFor(() => expect(nome).toHaveValue('José Silva'));

    // Sem data de desligamento o cálculo nem roda (guarda em handleCalc) e o
    // fluxo não grava em `desligamentos`.
    selecionarData('Data Desligamento', '2026-03-10');

    await userEvent.click(await screen.findByRole('button', { name: /Calcular Local/i }));
    await userEvent.click(await screen.findByRole('button', { name: /^Salvar$/i }));

    await waitFor(() => {
      const insert = buildersDesligamentos.flatMap((b) => b.__calls).find((c) => c.method === 'insert');
      expect(insert, 'nenhum insert em desligamentos foi feito').toBeDefined();
      expect(JSON.stringify(insert!.args[0])).toContain('"colaborador_id":"c2"');
      expect(JSON.stringify(insert!.args[0])).not.toContain('"colaborador_id":"c1"');
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
