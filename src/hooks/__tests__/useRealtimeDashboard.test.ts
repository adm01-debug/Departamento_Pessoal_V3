import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockChannel, mockRemoveChannel } = vi.hoisted(() => {
  const mockSubscribe = vi.fn().mockReturnValue({});
  const mockOn = vi.fn();
  const channelObj = { on: mockOn, subscribe: mockSubscribe };
  mockOn.mockReturnValue(channelObj);
  const mockChannel = vi.fn().mockReturnValue(channelObj);
  const mockRemoveChannel = vi.fn().mockResolvedValue(undefined);
  return { mockChannel, mockRemoveChannel };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { channel: mockChannel, removeChannel: mockRemoveChannel },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtualId: 'emp-1' }),
}));

vi.mock('sonner', () => ({ toast: { info: vi.fn() } }));

import { useRealtimeDashboard } from '../useRealtimeDashboard';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useRealtimeDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockSubscribe = vi.fn().mockReturnValue({});
    const mockOn = vi.fn();
    const channelObj = { on: mockOn, subscribe: mockSubscribe };
    mockOn.mockReturnValue(channelObj);
    mockChannel.mockReturnValue(channelObj);
    mockRemoveChannel.mockResolvedValue(undefined);
  });

  it('returns empresaAtualId', () => {
    const { result } = renderHook(() => useRealtimeDashboard(), { wrapper });
    expect(result.current.empresaAtualId).toBe('emp-1');
  });

  it('creates a supabase channel on mount', () => {
    renderHook(() => useRealtimeDashboard(), { wrapper });
    expect(mockChannel).toHaveBeenCalledWith(expect.stringContaining('dashboard-updates-emp-1'));
  });

  it('subscribes to postgres_changes', () => {
    renderHook(() => useRealtimeDashboard(), { wrapper });
    const channelObj = mockChannel.mock.results[0].value;
    expect(channelObj.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ schema: 'public' }),
      expect.any(Function)
    );
    expect(channelObj.subscribe).toHaveBeenCalled();
  });

  it('removes channel on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeDashboard(), { wrapper });
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});
