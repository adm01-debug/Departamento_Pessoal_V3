import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockFrom, mockParseWorkbook, mockNormalizarCPF, mockToastSuccess, mockToastError,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockParseWorkbook: vi.fn(),
  mockNormalizarCPF: vi.fn((cpf: string) => cpf),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/contexts', () => ({
  useEmpresa: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/utils/importacao/parser', () => ({
  parseWorkbookBuffer: mockParseWorkbook,
}));

vi.mock('@/utils/importacao/validators', () => ({
  normalizarCPF: mockNormalizarCPF,
}));

vi.mock('sonner', () => ({ toast: { success: mockToastSuccess, error: mockToastError } }));

import { useImportacaoColaboradores } from '../useImportacaoColaboradores';

function buildSelectChain(data: any[]) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve({ data, error: null }).then(fn);
  chain.catch = (fn: any) => Promise.resolve({ data, error: null }).catch(fn);
  chain.finally = (fn: any) => Promise.resolve({ data, error: null }).finally(fn);
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useImportacaoColaboradores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => buildSelectChain([]));
    mockParseWorkbook.mockResolvedValue([]);
  });

  it('initial state: empty rows, progress 0, not importing', () => {
    const { result } = renderHook(() => useImportacaoColaboradores(), { wrapper });
    expect(result.current.rows).toEqual([]);
    expect(result.current.progress).toBe(0);
    expect(result.current.isImporting).toBe(false);
  });

  it('exposes processarArquivo and importar functions', () => {
    const { result } = renderHook(() => useImportacaoColaboradores(), { wrapper });
    expect(typeof result.current.processarArquivo).toBe('function');
    expect(typeof result.current.importar).toBe('function');
  });

  it('processarArquivo parses file buffer and updates rows', async () => {
    const parsedRows = [
      { nome_completo: 'Alice', cpf: '123', status: 'valido' },
      { nome_completo: 'Bob', cpf: '456', status: 'invalido', erros: ['CPF inválido'] },
    ];
    mockParseWorkbook.mockResolvedValue(parsedRows);
    const mockFile = { arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) } as any;

    const { result } = renderHook(() => useImportacaoColaboradores(), { wrapper });

    await act(async () => {
      await result.current.processarArquivo(mockFile);
    });

    expect(mockParseWorkbook).toHaveBeenCalledWith(expect.any(ArrayBuffer), { existingCPFs: expect.any(Set) });
    expect(result.current.rows).toEqual(parsedRows);
  });

  it('processarArquivo queries colaboradores to build existingCPFs set', async () => {
    const existingCols = [{ cpf: '111' }, { cpf: '222' }];
    const chain = buildSelectChain(existingCols);
    mockFrom.mockReturnValue(chain);
    mockParseWorkbook.mockResolvedValue([]);
    const mockFile = { arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) } as any;

    const { result } = renderHook(() => useImportacaoColaboradores(), { wrapper });

    await act(async () => {
      await result.current.processarArquivo(mockFile);
    });

    expect(mockFrom).toHaveBeenCalledWith('colaboradores');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('importar inserts valid rows and shows success toast', async () => {
    const rows = [
      { nome_completo: 'Alice', cpf: '123', status: 'valido' as const },
      { nome_completo: 'Bob', cpf: '456', status: 'invalido' as const, erros: ['error'] },
    ];
    const chain = buildSelectChain([]);
    chain.insert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useImportacaoColaboradores(), { wrapper });

    act(() => {
      result.current.setRows(rows as any);
    });

    await act(async () => {
      await result.current.importar();
    });

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      nome_completo: 'Alice',
      empresa_id: 'emp-1',
      status: 'ativo',
    }));
    expect(chain.insert).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).toHaveBeenCalledWith('1 colaboradores importados');
  });

  it('processarArquivo shows error toast and rethrows on failure', async () => {
    mockParseWorkbook.mockRejectedValue(new Error('parse error'));
    const mockFile = { arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) } as any;

    const { result } = renderHook(() => useImportacaoColaboradores(), { wrapper });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.processarArquivo(mockFile);
      } catch (err: any) {
        caught = err;
      }
    });

    expect(caught?.message).toBe('parse error');
    expect(mockToastError).toHaveBeenCalledWith('parse error');
  });
});
