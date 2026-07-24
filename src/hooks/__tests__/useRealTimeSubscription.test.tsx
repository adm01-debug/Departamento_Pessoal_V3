import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRealTimeSubscription } from '../useRealTimeSubscription';

const { mockSubscribe, mockOn, mockRemoveChannel, mockChannel } = vi.hoisted(() => ({
  mockSubscribe: vi.fn(),
  mockOn: vi.fn(),
  mockRemoveChannel: vi.fn(),
  mockChannel: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@/services/loggerService', () => ({
  loggerService: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useRealTimeSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const channelObj = {
      on: mockOn,
      subscribe: mockSubscribe,
    };
    mockOn.mockReturnValue(channelObj);
    mockSubscribe.mockReturnValue(channelObj);
    mockChannel.mockReturnValue(channelObj);
  });

  it('does NOT subscribe when empresaId is undefined', () => {
    const wrapper = createWrapper();
    renderHook(
      () => useRealTimeSubscription('colaboradores', ['colaboradores'], undefined),
      { wrapper }
    );
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('does NOT subscribe when empresaId is empty string', () => {
    const wrapper = createWrapper();
    renderHook(
      () => useRealTimeSubscription('colaboradores', ['colaboradores'], ''),
      { wrapper }
    );
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('creates a channel when empresaId is provided', () => {
    const wrapper = createWrapper();
    renderHook(
      () => useRealTimeSubscription('colaboradores', ['colaboradores'], 'empresa-123'),
      { wrapper }
    );
    expect(mockChannel).toHaveBeenCalledWith(expect.stringContaining('rt-colaboradores-empresa-123'));
  });

  it('calls .on with correct postgres_changes config', () => {
    const wrapper = createWrapper();
    renderHook(
      () => useRealTimeSubscription('cargos', ['cargos'], 'empresa-abc', {
        event: 'INSERT',
        schema: 'public',
      }),
      { wrapper }
    );
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'cargos',
        filter: 'empresa_id=eq.empresa-abc',
      }),
      expect.any(Function)
    );
  });

  it('defaults event to * when not specified', () => {
    const wrapper = createWrapper();
    renderHook(
      () => useRealTimeSubscription('folha', ['folha'], 'empresa-xyz'),
      { wrapper }
    );
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: '*' }),
      expect.any(Function)
    );
  });

  it('calls subscribe on the channel', () => {
    const wrapper = createWrapper();
    renderHook(
      () => useRealTimeSubscription('colaboradores', ['colaboradores'], 'empresa-123'),
      { wrapper }
    );
    expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it('removes channel on unmount', () => {
    const channelObj = { on: mockOn, subscribe: mockSubscribe };
    mockOn.mockReturnValue(channelObj);
    mockChannel.mockReturnValue(channelObj);
    const wrapper = createWrapper();
    const { unmount } = renderHook(
      () => useRealTimeSubscription('colaboradores', ['colaboradores'], 'empresa-123'),
      { wrapper }
    );
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledWith(channelObj);
  });

  it('does NOT remove channel on unmount when empresaId is absent', () => {
    const wrapper = createWrapper();
    const { unmount } = renderHook(
      () => useRealTimeSubscription('colaboradores', ['colaboradores'], undefined),
      { wrapper }
    );
    unmount();
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });

  it('channel name includes table and empresaId', () => {
    const wrapper = createWrapper();
    renderHook(
      () => useRealTimeSubscription('afastamentos', ['afastamentos'], 'emp-999'),
      { wrapper }
    );
    const channelName = mockChannel.mock.calls[0][0] as string;
    expect(channelName).toContain('afastamentos');
    expect(channelName).toContain('emp-999');
  });
});
