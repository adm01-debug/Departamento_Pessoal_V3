import { vi } from 'vitest';

/**
 * Empresa canônica usada nos testes multi-tenant.
 *
 * Motivo: quase todos os hooks de domínio dependem de `useEmpresas()` para
 * obter o escopo de tenant. Como `useEmpresas` internamente consome
 * `useAuth()`, renderizar o hook fora de um `AuthProvider` lança
 * "useAuth must be used within AuthProvider". Em testes unitários de hook não
 * queremos montar a árvore de providers inteira — apenas fixar o tenant.
 */
export const TEST_EMPRESA_ID = '00000000-0000-0000-0000-0000000000e1';

export const TEST_EMPRESA = {
  id: TEST_EMPRESA_ID,
  razao_social: 'Empresa Teste LTDA',
  nome_fantasia: 'Empresa Teste',
  cnpj: '00000000000191',
  ativo: true,
} as const;

/**
 * Factory pronta para uso em `vi.mock`:
 *
 * ```ts
 * vi.mock('@/hooks/useEmpresas', async () =>
 *   (await import('@/test/empresaMock')).useEmpresasMockModule()
 * );
 * ```
 *
 * O `await import` mantém a chamada segura em relação ao hoisting do `vi.mock`.
 */
export function useEmpresasMockModule() {
  const useEmpresas = () => ({
    userEmpresas: [],
    todasEmpresas: [TEST_EMPRESA],
    empresaAtual: TEST_EMPRESA,
    empresaAtualId: TEST_EMPRESA_ID,
    modo: 'empresa_unica' as const,
    isConsolidado: false,
    setModo: vi.fn(),
    loadingEmpresas: false,
    loadingTodas: false,
    criarEmpresa: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
    atualizarEmpresa: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
    associarUsuario: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
    definirEmpresaPadrao: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
    trocarEmpresa: vi.fn(),
    temMultiplasEmpresas: false,
  });

  return {
    useEmpresas,
    useEmpresaStore: Object.assign(
      () => ({
        empresaAtualId: TEST_EMPRESA_ID,
        modo: 'empresa_unica' as const,
        setEmpresaAtual: vi.fn(),
        setModo: vi.fn(),
      }),
      { getState: () => ({ empresaAtualId: TEST_EMPRESA_ID, modo: 'empresa_unica' as const }) }
    ),
  };
}
