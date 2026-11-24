import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Resgate da branch `muri`. O contrato que estes casos travam e o FAIL-CLOSED:
// sem dado (carregando, erro, sem papel) `pode()` devolve false — nunca libera
// por omissao. E o tri-state: erro TECNICO nao e "sem permissao".
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
const estadoAuth = {
  user: null as { id: string; email: string; roles: string[] } | null,
  isAdmin: false,
  isReady: true,
  rolesStatus: 'success' as 'loading' | 'success' | 'error',
  rolesError: null as string | null,
};

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mockFrom } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => estadoAuth }));

import { usePermissions } from '../usePermissions';

function matriz(linhas: unknown[] | null, erro: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockResolvedValue({ data: linhas, error: erro });
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estadoAuth.user = { id: 'u1', email: 'u@x', roles: ['gestor'] };
    estadoAuth.isAdmin = false;
    estadoAuth.isReady = true;
    estadoAuth.rolesStatus = 'success';
    estadoAuth.rolesError = null;
    mockFrom.mockImplementation(() => matriz([]));
  });

  it('libera o que a matriz concede', async () => {
    mockFrom.mockImplementation(() =>
      matriz([{ role: 'gestor', resource: 'auditoria', action: 'read', allowed: true }])
    );
    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.estado).toBe('success'));
    expect(result.current.pode('auditoria', 'read')).toBe(true);
  });

  it('nega quando a linha existe com allowed=false', async () => {
    mockFrom.mockImplementation(() =>
      matriz([{ role: 'gestor', resource: 'auditoria', action: 'read', allowed: false }])
    );
    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.estado).toBe('success'));
    expect(result.current.pode('auditoria', 'read')).toBe(false);
  });

  it('nega quando a matriz esta vazia (fail-closed)', async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.estado).toBe('success'));
    expect(result.current.pode('auditoria', 'read')).toBe(false);
  });

  it('sem papel nenhum nem consulta a matriz, e nega', async () => {
    estadoAuth.user = { id: 'u1', email: 'u@x', roles: [] };
    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.consultaAtiva).toBe(false));
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.pode('auditoria', 'read')).toBe(false);
  });

  it('admin passa sem consultar a matriz', async () => {
    estadoAuth.isAdmin = true;
    const { result } = renderHook(() => usePermissions(), { wrapper });
    expect(result.current.pode('qualquer', 'coisa')).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // Falha da consulta = estado 'error', NAO 'sem permissao'.
  it('erro na consulta vira estado error, com a mensagem do PostgREST', async () => {
    mockFrom.mockImplementation(() => matriz(null, { message: 'permission denied', code: '42501' }));
    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.estado).toBe('error'));
    expect(result.current.erro).toContain('42501');
    expect(result.current.pode('auditoria', 'read')).toBe(false);
  });

  it('falha ao ler os papeis tem precedencia e vira estado error', async () => {
    estadoAuth.rolesStatus = 'error';
    estadoAuth.rolesError = 'Tempo esgotado ao verificar as permissões do usuário.';
    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.estado).toBe('error'));
    expect(result.current.erro).toMatch(/Tempo esgotado/);
  });
});
