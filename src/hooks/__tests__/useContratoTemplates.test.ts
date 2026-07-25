import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseQuery, mockUseMutation, mockUseQueryClient } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseMutation: vi.fn(),
  mockUseQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
  useQueryClient: mockUseQueryClient,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/services/contratoTemplateService', () => ({
  contratoTemplateService: {
    listar: vi.fn(),
    salvar: vi.fn(),
    duplicarNovaVersao: vi.fn(),
    excluir: vi.fn(),
    gerarPdf: vi.fn(),
  },
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any, fallback: string) => fallback),
}));

import { useContratoTemplates } from '../useContratoTemplates';

const DEFAULT_MUTATION = { mutate: vi.fn(), isPending: false, isError: false };

describe('useContratoTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue(DEFAULT_MUTATION);
  });

  it('returns empty templates when loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useContratoTemplates());
    expect(result.current.templates).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns templates from query data', () => {
    const templates = [{ id: 't1', nome: 'CLT Padrão' }];
    mockUseQuery.mockReturnValue({ data: templates, isLoading: false });
    const { result } = renderHook(() => useContratoTemplates());
    expect(result.current.templates).toEqual(templates);
    expect(result.current.isLoading).toBe(false);
  });

  it('exposes salvar mutation', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    const { result } = renderHook(() => useContratoTemplates());
    expect(result.current.salvar).toBeDefined();
    expect(typeof result.current.salvar.mutate).toBe('function');
  });

  it('exposes duplicar mutation', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    const { result } = renderHook(() => useContratoTemplates());
    expect(result.current.duplicar).toBeDefined();
  });

  it('exposes excluir mutation', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    const { result } = renderHook(() => useContratoTemplates());
    expect(result.current.excluir).toBeDefined();
  });

  it('exposes gerarContrato mutation', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    const { result } = renderHook(() => useContratoTemplates());
    expect(result.current.gerarContrato).toBeDefined();
  });

  it('queries with empresa_id key', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    renderHook(() => useContratoTemplates());
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contrato-templates', 'emp-1'] })
    );
  });
});
