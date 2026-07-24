import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockUseGenericCrud, mockListarLogs, mockListarConfiguracoes, mockListarProrrogacoes } = vi.hoisted(() => ({
  mockUseGenericCrud: vi.fn(),
  mockListarLogs: vi.fn(),
  mockListarConfiguracoes: vi.fn(),
  mockListarProrrogacoes: vi.fn(),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../useGenericCrud', () => ({
  useGenericCrud: mockUseGenericCrud,
}));

vi.mock('@/services/webhookService', () => ({
  webhookService: {
    listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn(),
    listarLogs: mockListarLogs,
  },
}));

vi.mock('@/services/afastamentoService', () => ({
  afastamentoService: {
    listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn(),
    listarConfiguracoes: mockListarConfiguracoes,
    listarProrrogacoes: mockListarProrrogacoes,
    criarProrrogacao: vi.fn().mockResolvedValue({ id: 'p1' }),
    listarDocumentos: vi.fn().mockResolvedValue([]),
    uploadDocumento: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/services/beneficioService', () => ({
  beneficioService: {
    listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn(),
    obterResumoCustos: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/services/colaboradorService', () => ({
  colaboradorService: {
    listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn(),
    getSummary: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: { log: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useWebhooksAvancados, useWebhookLogs } from '../useWebhooksAvancados';
import { useAfastamentos } from '../useAfastamentos';
import { useBeneficios } from '../useBeneficios';
import { useColaboradores } from '../useColaboradores';

function makeCrudReturn(overrides: Record<string, any> = {}) {
  return {
    items: [],
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    criar: vi.fn(),
    atualizar: vi.fn(),
    excluir: vi.fn(),
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useWebhooksAvancados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGenericCrud.mockReturnValue(makeCrudReturn());
  });

  it('exposes webhooks as alias for items', () => {
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ items: [{ id: 'w1', url: 'https://hook.io' }] }));
    const { result } = renderHook(() => useWebhooksAvancados(), { wrapper });
    expect(result.current.webhooks).toHaveLength(1);
  });

  it('passes webhookService to useGenericCrud with empresa_id filter', () => {
    renderHook(() => useWebhooksAvancados(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expect.objectContaining({ empresa_id: 'emp-1' }) })
    );
  });
});

describe('useWebhookLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarLogs.mockResolvedValue([]);
  });

  it('is disabled when no webhookId', () => {
    const { result } = renderHook(() => useWebhookLogs(''), { wrapper });
    expect(mockListarLogs).not.toHaveBeenCalled();
  });

  it('calls listarLogs with webhookId', async () => {
    const { result } = renderHook(() => useWebhookLogs('w1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarLogs).toHaveBeenCalledWith('w1');
  });
});

describe('useAfastamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGenericCrud.mockReturnValue(makeCrudReturn());
    mockListarConfiguracoes.mockResolvedValue([]);
  });

  it('exposes afastamentos as alias for items', () => {
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ items: [{ id: 'a1' }] }));
    const { result } = renderHook(() => useAfastamentos(), { wrapper });
    expect(result.current.afastamentos).toHaveLength(1);
  });

  it('passes successMessages to useGenericCrud', () => {
    renderHook(() => useAfastamentos(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({
        successMessages: expect.objectContaining({ create: expect.any(String) }),
      })
    );
  });

  it('exposes filtros and setFiltros', () => {
    const { result } = renderHook(() => useAfastamentos(), { wrapper });
    expect(result.current.filtros).toBeDefined();
    expect(typeof result.current.setFiltros).toBe('function');
  });
});

describe('useBeneficios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGenericCrud.mockReturnValue(makeCrudReturn());
  });

  it('exposes beneficios as alias for items', () => {
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ items: [{ id: 'b1' }] }));
    const { result } = renderHook(() => useBeneficios(), { wrapper });
    expect(result.current.beneficios).toHaveLength(1);
  });

  it('exposes tiposBeneficio array', () => {
    const { result } = renderHook(() => useBeneficios(), { wrapper });
    expect(result.current.tiposBeneficio).toContain('transporte');
    expect(result.current.tiposBeneficio).toContain('alimentacao');
  });
});

describe('useColaboradores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGenericCrud.mockReturnValue(makeCrudReturn());
  });

  it('exposes colaboradores as alias for items', () => {
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ items: [{ id: 'c1', nome_completo: 'Dev' }] }));
    const { result } = renderHook(() => useColaboradores(), { wrapper });
    expect(result.current.colaboradores).toHaveLength(1);
  });

  it('exposes status, setStatus, departamento, cargo filters', () => {
    const { result } = renderHook(() => useColaboradores(), { wrapper });
    expect(result.current.status).toBe('all');
    expect(typeof result.current.setStatus).toBe('function');
    expect(result.current.departamento).toBe('all');
    expect(result.current.cargo).toBe('all');
  });

  it('criar injects empresa_id from empresaAtual', async () => {
    const mockCriar = vi.fn().mockResolvedValue({ id: 'c1' });
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ criar: mockCriar }));
    const { result } = renderHook(() => useColaboradores(), { wrapper });
    await result.current.criar({ nome_completo: 'Dev' });
    expect(mockCriar).toHaveBeenCalledWith(expect.objectContaining({ nome_completo: 'Dev', empresa_id: 'emp-1' }));
  });
});
