import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFrom, mockAuthUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAuthUser: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockAuthUser() }),
}));

import { useAssinaturas } from '../useAssinaturas';

function buildChain(data: any[]) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve({ data, error: null }).then(fn);
  chain.catch = (fn: any) => Promise.resolve({ data, error: null }).catch(fn);
  chain.finally = (fn: any) => Promise.resolve({ data, error: null }).finally(fn);
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useAssinaturas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser.mockReturnValue({ id: 'user-1' });
    mockFrom.mockImplementation(() => buildChain([]));
  });

  it('returns empty documentos and zero stats when no data', async () => {
    const { result } = renderHook(() => useAssinaturas(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.documentos).toEqual([]);
    expect(result.current.stats.total).toBe(0);
    expect(result.current.stats.pendentes).toBe(0);
    expect(result.current.stats.assinados).toBe(0);
    expect(result.current.stats.expirados).toBe(0);
  });

  it('is disabled (no query) when user is null', () => {
    mockAuthUser.mockReturnValue(null);
    renderHook(() => useAssinaturas(), { wrapper });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('maps token to DocumentoAssinatura with pendente status', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date().toISOString();
    const tokens = [{
      id: 't1',
      admissao_id: 'adm-1',
      email_candidato: 'john@test.com',
      data_expiracao: futureDate.toISOString(),
      contrato_assinado: null,
      assinado_em: null,
      created_at: now,
      admissoes: { nome: 'John Doe', cargo: 'Developer' },
    }];
    mockFrom.mockImplementation(() => buildChain(tokens));
    const { result } = renderHook(() => useAssinaturas(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.documentos).toHaveLength(1);
    const doc = result.current.documentos[0];
    expect(doc.colaborador).toBe('John Doe');
    expect(doc.status).toBe('pendente');
    expect(doc.titulo).toBe('Contrato de Trabalho - Developer');
    expect(doc.tipo).toBe('Contrato Admissão');
    expect(result.current.stats.total).toBe(1);
    expect(result.current.stats.pendentes).toBe(1);
  });

  it('sets status to assinado when contrato_assinado is truthy', async () => {
    const signedAt = new Date().toISOString();
    const tokens = [{
      id: 't1', admissao_id: 'adm-1', email_candidato: 'x@test.com',
      data_expiracao: new Date(Date.now() + 86400000).toISOString(),
      contrato_assinado: true, assinado_em: signedAt,
      created_at: new Date().toISOString(), admissoes: null,
    }];
    mockFrom.mockImplementation(() => buildChain(tokens));
    const { result } = renderHook(() => useAssinaturas(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.documentos[0].status).toBe('assinado');
    expect(result.current.stats.assinados).toBe(1);
  });

  it('sets status to expirado when expired and not signed', async () => {
    const tokens = [{
      id: 't1', admissao_id: 'adm-1', email_candidato: 'x@test.com',
      data_expiracao: new Date(Date.now() - 86400000).toISOString(),
      contrato_assinado: null, assinado_em: null,
      created_at: new Date().toISOString(), admissoes: null,
    }];
    mockFrom.mockImplementation(() => buildChain(tokens));
    const { result } = renderHook(() => useAssinaturas(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.documentos[0].status).toBe('expirado');
    expect(result.current.stats.expirados).toBe(1);
  });

  it('uses email_candidato as colaborador name when admissoes is null', async () => {
    const tokens = [{
      id: 't1', admissao_id: 'adm-1', email_candidato: 'cand@test.com',
      data_expiracao: new Date(Date.now() + 86400000).toISOString(),
      contrato_assinado: null, assinado_em: null,
      created_at: new Date().toISOString(), admissoes: null,
    }];
    mockFrom.mockImplementation(() => buildChain(tokens));
    const { result } = renderHook(() => useAssinaturas(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.documentos[0].colaborador).toBe('cand@test.com');
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useAssinaturas(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });
});
