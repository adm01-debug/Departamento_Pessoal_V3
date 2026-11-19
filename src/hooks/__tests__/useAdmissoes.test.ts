import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── hoisted mock fns (available inside vi.mock factories) ──────────────────────
const { mockListarAdmissoes, mockCriar, mockAtualizar, mockToastSuccess, mockToastError, mockUseEmpresas } = vi.hoisted(
  () => ({
    mockListarAdmissoes: vi.fn(),
    mockCriar: vi.fn(),
    mockAtualizar: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockUseEmpresas: vi.fn(),
  })
);

// ── module mocks ───────────────────────────────────────────────────────────────
vi.mock('@/services', () => ({
  admissaoService: {
    listarAdmissoes: mockListarAdmissoes,
    criar: mockCriar,
    atualizar: mockAtualizar,
  },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: mockUseEmpresas,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', roles: [] },
    session: null,
    loading: false,
    isReady: true,
    isAdmin: false,
    hasRole: vi.fn().mockReturnValue(false),
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

// ── import after mocks ─────────────────────────────────────────────────────────
import { useAdmissoes } from '../useAdmissoes';

// ── QueryClient wrapper ────────────────────────────────────────────────────────
function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

/** Igual ao de cima, mas devolve o client junto — para espiar invalidações. */
function makeWrapperComClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
  return { qc, wrapper };
}

// ── tests ──────────────────────────────────────────────────────────────────────
describe('useAdmissoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'empresa-1' } });
    mockListarAdmissoes.mockResolvedValue([]);
    mockCriar.mockResolvedValue({ id: 'admissao-novo' });
    mockAtualizar.mockResolvedValue({ id: 'admissao-1' });
  });

  it('returns empty admissoes when empresaAtual is null', () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: null });
    const { result } = renderHook(() => useAdmissoes(), { wrapper: makeWrapper() });
    expect(result.current.admissoes).toEqual([]);
  });

  it('calls listarAdmissoes with empresaId', async () => {
    renderHook(() => useAdmissoes(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(mockListarAdmissoes).toHaveBeenCalledWith('empresa-1');
    });
  });

  it('returns admissoes data from query', async () => {
    const mockData = [{ id: 'adm-1', nome: 'João Silva' }];
    mockListarAdmissoes.mockResolvedValue(mockData);

    const { result } = renderHook(() => useAdmissoes(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.admissoes).toEqual(mockData);
    });
  });

  it('criar invalida TAMBÉM a trilha de auditoria da aba Auditoria', async () => {
    // A aba Auditoria da mesma página lê por outra chave
    // (['auditoria-admissoes', empresaId]) e o botão "Nova Admissão" fica
    // disponível com ela aberta. Sem esta invalidação o RH cria a admissão e a
    // trilha continua dizendo que nenhum evento foi registrado.
    const { qc, wrapper } = makeWrapperComClient();
    const espiao = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useAdmissoes(), { wrapper });

    await act(async () => {
      await result.current.criar({
        nome: 'Ana',
        cargo: 'Analista',
        departamento: 'TI',
        data_prevista: '2026-12-01',
        salario_proposto: 4000,
      });
    });

    const chaves = espiao.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(chaves).toContain(JSON.stringify(['admissoes', 'empresa-1']));
    expect(chaves).toContain(JSON.stringify(['auditoria-admissoes', 'empresa-1']));
  });

  it('criar merges empresa_id into the payload', async () => {
    const { result } = renderHook(() => useAdmissoes(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.criar({
        nome: 'Maria',
        cargo: 'Desenvolvedora',
        departamento: 'TI',
        data_prevista: '2026-10-15',
        salario_proposto: 5000,
      });
    });

    expect(mockCriar).toHaveBeenCalledWith({
      nome: 'Maria',
      cargo: 'Desenvolvedora',
      departamento: 'TI',
      data_prevista: '2026-10-15',
      salario_proposto: 5000,
      empresa_id: 'empresa-1',
    });
  });

  it('shows success toast after criar', async () => {
    const { result } = renderHook(() => useAdmissoes(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.criar({
        nome: 'Maria',
        cargo: 'Desenvolvedora',
        departamento: 'TI',
        data_prevista: '2026-10-15',
        salario_proposto: 5000,
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Admissão criada com sucesso');
  });

  it('atualizar calls service with id and data', async () => {
    const { result } = renderHook(() => useAdmissoes(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.atualizar({ id: 'adm-1', data: { nome: 'Maria Atualizada' } });
    });

    // Isolamento multi-tenant: o service exige empresa_id como 3º argumento.
    expect(mockAtualizar).toHaveBeenCalledWith('adm-1', { nome: 'Maria Atualizada' }, 'empresa-1');
  });

  it('shows error toast when criar fails', async () => {
    mockCriar.mockRejectedValue(new Error('Erro de servidor'));

    const { result } = renderHook(() => useAdmissoes(), { wrapper: makeWrapper() });

    await act(async () => {
      try {
        await result.current.criar({
          nome: 'Maria',
          cargo: 'Desenvolvedora',
          departamento: 'TI',
          data_prevista: '2026-10-15',
          salario_proposto: 5000,
        });
      } catch {
        // expected: mutateAsync re-throws on error
      }
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Erro de servidor');
    });
  });
});
