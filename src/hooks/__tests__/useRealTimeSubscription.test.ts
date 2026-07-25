import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseQueryClient } = vi.hoisted(() => ({
  mockUseQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: mockUseQueryClient,
}));

const mockSubscribe = vi.fn((_cb: Function) => ({ unsubscribe: vi.fn() }));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn, subscribe: mockSubscribe }));
const mockRemoveChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@/services/loggerService', () => ({
  loggerService: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { useRealTimeSubscription } from '../useRealTimeSubscription';

describe('useRealTimeSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel.mockReturnValue({ on: mockOn, subscribe: vi.fn() });
    mockOn.mockReturnValue({ subscribe: vi.fn() });
  });

  it('does not subscribe when empresaId is undefined', () => {
    renderHook(() => useRealTimeSubscription('colaboradores', ['test'], undefined));
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('subscribes to a channel when empresaId is provided', () => {
    renderHook(() => useRealTimeSubscription('colaboradores', ['colabs'], 'emp-1'));
    expect(mockChannel).toHaveBeenCalled();
    const channelName: string = mockChannel.mock.calls[0][0];
    expect(channelName).toContain('colaboradores');
    expect(channelName).toContain('emp-1');
  });

  it('calls supabase.channel with unique name per mount', () => {
    renderHook(() => useRealTimeSubscription('ferias', ['ferias'], 'emp-1'));
    renderHook(() => useRealTimeSubscription('ferias', ['ferias'], 'emp-1'));
    expect(mockChannel).toHaveBeenCalledTimes(2);
    const name1: string = mockChannel.mock.calls[0][0];
    const name2: string = mockChannel.mock.calls[1][0];
    expect(name1).not.toBe(name2);
  });

  it('calls removeChannel on unmount', () => {
    const mockChan = { on: mockOn, subscribe: vi.fn() };
    mockChannel.mockReturnValue(mockChan);
    mockOn.mockReturnValue(mockChan);
    const { unmount } = renderHook(() => useRealTimeSubscription('colaboradores', ['test'], 'emp-1'));
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('does not call removeChannel when no empresaId was set', () => {
    const { unmount } = renderHook(() => useRealTimeSubscription('colaboradores', ['test'], undefined));
    unmount();
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });
});
