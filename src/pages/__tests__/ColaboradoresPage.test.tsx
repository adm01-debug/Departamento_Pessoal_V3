import { describe, it, expect, vi } from 'vitest';
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
  PageLayout: ({ children, actions }: any) => (
    <div data-testid="page-layout">
      {actions}
      {children}
    </div>
  ),
}));
vi.mock('@/components/PageTitle', () => ({
  PageTitle: () => null,
}));

function baseHookReturn(overrides: Partial<ReturnType<typeof buildDefault>> = {}) {
  return { ...buildDefault(), ...overrides };
}

function buildDefault() {
  return {
    colaboradores: [] as any[],
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
    mockUseColaboradores.mockReturnValue(
      baseHookReturn({ error: new Error('Falha ao carregar colaboradores') })
    );
    renderPage();
    expect(screen.queryByText('Ana Beatriz Souza')).not.toBeInTheDocument();
  });

  it('exibe o KPI "Pendentes" e não exibe mais "Inativos"', () => {
    mockUseColaboradores.mockReturnValue(
      baseHookReturn({ summary: { total: 0, ativo: 0, pendente: 0, desligado: 0, ferias: 0, afastado: 0 } })
    );
    renderPage();
    expect(screen.getByText('Pendentes')).toBeInTheDocument();
    expect(screen.queryByText('Inativos')).not.toBeInTheDocument();
  });
});
