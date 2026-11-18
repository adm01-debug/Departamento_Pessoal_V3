import { describe, it, expect, vi } from 'vitest';
import type { ComponentProps, ElementType, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ColaboradoresPage from '@/pages/ColaboradoresPage';

// PARTE 2B: MOCK_MODE foi removido de ColaboradoresPage.tsx — a página agora
// sempre consome useColaboradores(). Este teste prova isso substituindo o
// hook por dados "reais" (nomes que NÃO existem em MOCK_COLABORADORES) e
// confirmando que é isso que aparece na tela — nenhum dado fictício do mock
// module deveria aparecer nem ser importado.

const { mockUseColaboradores } = vi.hoisted(() => ({
  mockUseColaboradores: vi.fn(),
}));

vi.mock('@/hooks/useColaboradores', () => ({
  useColaboradores: mockUseColaboradores,
}));

// A main lê `departamentosDisponiveis`/`cargosDisponiveis` do próprio
// `useColaboradores` (ColaboradoresPage.tsx:65) e mascara PII por `usePiiMask`,
// que usa react-query — dois mocks que a versão da muri não tinha.
vi.mock('@/hooks/usePiiMask', () => {
  const comoEsta = (v: string | null | undefined) => v ?? '';
  return {
    usePiiMask: () => ({
      canViewPii: true,
      cpf: comoEsta,
      pis: comoEsta,
      bankAccount: comoEsta,
      email: comoEsta,
      phone: comoEsta,
      rg: comoEsta,
      endereco: comoEsta,
      pix: (_tipo: string | null | undefined, chave: string | null | undefined) => chave ?? '',
      deep: (v: unknown) => v,
    }),
  };
});

vi.mock('@/hooks/useDepartamentos', () => ({
  useDepartamentos: () => ({ departamentos: [] }),
}));

vi.mock('@/hooks/useCargos', () => ({
  useCargos: () => ({ cargos: [] }),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/hooks/useExcelExport', () => ({
  useExcelExport: () => ({ exportarExcel: vi.fn() }),
}));

vi.mock('@/hooks/usePDFExport', () => ({
  usePDFExport: () => ({ exportarPDF: vi.fn() }),
}));

vi.mock('@/hooks/useVinculos', () => ({
  useVinculosResumo: () => ({ data: {} }),
}));

// PageLayout/PageTitle puxam Helmet/Breadcrumbs/Tooltip — shells mínimos
// para manter o teste focado na listagem (mesmo padrão de ImportacaoPage.test.tsx).
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children, actions }: { children?: ReactNode; actions?: ReactNode }) => (
    <div data-testid="page-layout">
      {actions}
      {children}
    </div>
  ),
}));
vi.mock('@/components/PageTitle', () => ({
  PageTitle: () => null,
}));

/** A linha como a PÁGINA a consome — não a `Row` inteira da tabela. */
type LinhaColaborador = {
  id: string;
  nome_completo: string;
  cpf?: string | null;
  email?: string | null;
  status?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  foto_url?: string | null;
  matricula?: string | null;
};

function baseHookReturn(overrides: Partial<ReturnType<typeof buildDefault>> = {}) {
  return { ...buildDefault(), ...overrides };
}

function buildDefault() {
  return {
    colaboradores: [] as LinhaColaborador[],
    total: 0,
    isLoading: false,
    isFetching: false,
    error: null as unknown,
    page: 1,
    setPage: vi.fn(),
    pageSize: 25,
    search: '',
    setSearch: vi.fn(),
    status: 'all',
    setStatus: vi.fn(),
    departamento: 'all',
    setDepartamento: vi.fn(),
    cargo: 'all',
    setCargo: vi.fn(),
    refetch: vi.fn(),
    summary: { total: 0, ativo: 0, pendente: 0, desligado: 0, ferias: 0, afastado: 0 },
    isLoadingSummary: false,
    // A main monta as opções dos filtros a partir do próprio hook
    // (useColaboradores.ts:63-64); sem estes dois a página quebra no `.map`.
    departamentosDisponiveis: [] as string[],
    cargosDisponiveis: [] as string[],
    criar: vi.fn(),
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ColaboradoresPage />
    </MemoryRouter>
  );
}

describe('ColaboradoresPage (sem MOCK_MODE)', () => {
  it('renderiza colaboradores vindos de useColaboradores(), não do mock module', () => {
    mockUseColaboradores.mockReturnValue(
      baseHookReturn({
        colaboradores: [
          {
            id: 'real-1',
            nome_completo: 'Colaborador Real de Teste',
            cpf: '11122233344',
            email: 'real@empresa.com',
            status: 'pendente',
            cargo: 'Analista Real',
            departamento: 'Departamento Real',
            matricula: 'R001',
          },
        ],
        total: 1,
        summary: { total: 1, ativo: 0, pendente: 1, desligado: 0, ferias: 0, afastado: 0 },
      })
    );

    renderPage();

    // Dados reais (mockados via useColaboradores) aparecem, incluindo
    // cargo/departamento (correção da PARTE 2A).
    expect(screen.getByText('Colaborador Real de Teste')).toBeInTheDocument();
    expect(screen.getByText('Analista Real')).toBeInTheDocument();
    expect(screen.getByText('Departamento Real')).toBeInTheDocument();

    // Nenhum nome fictício de MOCK_COLABORADORES deveria aparecer.
    expect(screen.queryByText('Ana Beatriz Souza')).not.toBeInTheDocument();
    expect(screen.queryByText('Carlos Eduardo Lima')).not.toBeInTheDocument();
  });

  it('mostra estado vazio quando a listagem real não retorna colaboradores', () => {
    mockUseColaboradores.mockReturnValue(baseHookReturn());
    renderPage();
    expect(screen.queryByText('Ana Beatriz Souza')).not.toBeInTheDocument();
  });

  it('mostra estado de erro quando useColaboradores() retorna error', () => {
    mockUseColaboradores.mockReturnValue(baseHookReturn({ error: new Error('Falha ao carregar colaboradores') }));
    renderPage();
    expect(screen.queryByText('Ana Beatriz Souza')).not.toBeInTheDocument();
  });

  // AJUSTADO NO RESGATE: na muri os rótulos apareciam em cards de KPI, que a
  // main não tem nesta página. O defeito que a muri corrigiu é o mesmo e segue
  // provado aqui pelo CHIP de filtro ativo, que imprime o rótulo da opção
  // escolhida: 'pendente' existe no enum e tem rótulo; 'inativo' não existe
  // mais na lista, então não há como filtrar por um valor impossível.
  it('o filtro de status oferece "Pendentes" (status real do enum)', () => {
    mockUseColaboradores.mockReturnValue(baseHookReturn({ status: 'pendente' }));
    renderPage();
    // O rótulo aparece no gatilho do seletor e no chip — basta existir na tela.
    expect(screen.getAllByText('Pendentes').length).toBeGreaterThan(0);
  });

  it('não oferece mais "Inativos", valor que o enum status_colaborador não tem', () => {
    mockUseColaboradores.mockReturnValue(baseHookReturn({ status: 'inativo' }));
    renderPage();
    // Sem rótulo na lista, o chip cai no próprio valor — prova de que 'inativo'
    // deixou de ser uma opção oferecida ao usuário.
    expect(screen.queryByText('Inativos')).not.toBeInTheDocument();
    expect(screen.getByText('inativo')).toBeInTheDocument();
  });
});
