import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAssinaturaDigital } from '../useAssinaturaDigital';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

const mockUpdate = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: (data: unknown) => {
        mockUpdate(data);
        return {
          eq: () => ({
            select: () => ({
              single: () => mockSingle(),
            }),
          }),
        };
      },
    }),
  },
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe('useAssinaturaDigital', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns assinarContrato mutation', () => {
    const { result } = renderHook(() => useAssinaturaDigital(), { wrapper });
    expect(result.current.assinarContrato).toBeDefined();
    expect(typeof result.current.assinarContrato.mutate).toBe('function');
  });

  it('calls supabase update with signed status on success', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'tok1', contrato_assinado: true }, error: null });
    const { result } = renderHook(() => useAssinaturaDigital(), { wrapper });

    await act(async () => {
      result.current.assinarContrato.mutate({ tokenId: 'tok1', ip: '127.0.0.1' });
    });

    await waitFor(() => expect(result.current.assinarContrato.isSuccess).toBe(true));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ contrato_assinado: true })
    );
  });

  it('shows success toast on successful signature', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'tok1' }, error: null });
    const { result } = renderHook(() => useAssinaturaDigital(), { wrapper });

    await act(async () => {
      result.current.assinarContrato.mutate({ tokenId: 'tok1' });
    });

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith(
      'Assinatura digital realizada com sucesso'
    ));
  });

  it('invalidates queries after success', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'tok1' }, error: null });
    const { result } = renderHook(() => useAssinaturaDigital(), { wrapper });

    await act(async () => {
      result.current.assinarContrato.mutate({ tokenId: 'tok1' });
    });

    await waitFor(() => expect(mockInvalidateQueries).toHaveBeenCalledTimes(2));
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['contratacao-token'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['assinaturas-digitais'] });
  });

  it('shows error toast when supabase returns error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'token not found' } });
    const { result } = renderHook(() => useAssinaturaDigital(), { wrapper });

    await act(async () => {
      result.current.assinarContrato.mutate({ tokenId: 'bad-token' });
    });

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('token not found'));
  });

  it('uses navigator.userAgent when userAgent not provided', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'tok1' }, error: null });
    const { result } = renderHook(() => useAssinaturaDigital(), { wrapper });

    await act(async () => {
      result.current.assinarContrato.mutate({ tokenId: 'tok1' });
    });

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.metadata.assinatura_digital.userAgent).toBe(navigator.userAgent);
  });

  it('uses "unknown" ip when ip not provided', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'tok1' }, error: null });
    const { result } = renderHook(() => useAssinaturaDigital(), { wrapper });

    await act(async () => {
      result.current.assinarContrato.mutate({ tokenId: 'tok1' });
    });

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.metadata.assinatura_digital.ip).toBe('unknown');
  });
});
