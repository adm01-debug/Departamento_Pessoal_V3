import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseMutation, mockUseQueryClient } = vi.hoisted(() => ({
  mockUseMutation: vi.fn(),
  mockUseQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mockUseMutation,
  useQueryClient: mockUseQueryClient,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockStorage = {
  from: vi.fn().mockReturnValue({
    upload: vi.fn().mockResolvedValue({ error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url' }, error: null }),
  }),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
    storage: mockStorage,
  },
}));

vi.mock('@/utils/comunicadoFeriasColetivasPDF', () => ({
  gerarComunicadoMTE: vi.fn().mockResolvedValue({ filename: 'mte.pdf', blob: new Blob(), hash: 'abc' }),
  gerarComunicadoSindicato: vi.fn().mockResolvedValue({ filename: 'sind.pdf', blob: new Blob(), hash: 'def' }),
}));

import { useGerarComunicadoColetivas, baixarComunicadoColetivas } from '../useGerarComunicadoColetivas';

describe('useGerarComunicadoColetivas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('calls useMutation with mutationFn', () => {
    renderHook(() => useGerarComunicadoColetivas());
    expect(mockUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({ mutationFn: expect.any(Function) })
    );
  });

  it('exposes mutate function', () => {
    const { result } = renderHook(() => useGerarComunicadoColetivas());
    expect(typeof result.current.mutate).toBe('function');
  });

  it('isPending is false by default', () => {
    const { result } = renderHook(() => useGerarComunicadoColetivas());
    expect(result.current.isPending).toBe(false);
  });

  it('invalidates ferias_coletivas on success', () => {
    const invalidate = vi.fn();
    mockUseQueryClient.mockReturnValue({ invalidateQueries: invalidate });
    let capturedOnSuccess: Function;
    mockUseMutation.mockImplementation(({ onSuccess }: any) => {
      capturedOnSuccess = onSuccess;
      return { mutate: vi.fn(), isPending: false };
    });
    renderHook(() => useGerarComunicadoColetivas());
    capturedOnSuccess!();
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['ferias_coletivas'] })
    );
  });

  it('passes onError to useMutation', () => {
    renderHook(() => useGerarComunicadoColetivas());
    expect(mockUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });
});

describe('baixarComunicadoColetivas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns signed URL for given path', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.storage.from as any).mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/pdf' }, error: null }),
    });
    const url = await baixarComunicadoColetivas('emp/col/mte.pdf');
    expect(url).toBe('https://example.com/pdf');
  });

  it('throws on storage error', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.storage.from as any).mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: new Error('storage fail') }),
    });
    await expect(baixarComunicadoColetivas('bad/path.pdf')).rejects.toBeDefined();
  });
});
