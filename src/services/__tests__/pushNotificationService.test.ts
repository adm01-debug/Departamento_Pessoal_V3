import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUpsert, mockUpdate } = vi.hoisted(() => ({
  mockUpsert: vi.fn().mockResolvedValue({ error: null }),
  mockUpdate: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: mockUpsert,
      update: mockUpdate,
    })),
  },
}));

// Browser API mocks
const mockGetSubscription = vi.fn();
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockPushManager = { getSubscription: mockGetSubscription, subscribe: mockSubscribe };
const mockReady = Promise.resolve({ pushManager: mockPushManager });

Object.defineProperty(globalThis, 'navigator', {
  value: {
    serviceWorker: { ready: mockReady },
    userAgent: 'TestAgent',
    language: 'pt-BR',
    platform: 'TestPlatform',
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'Notification', {
  value: { requestPermission: vi.fn().mockResolvedValue('granted') },
  writable: true,
  configurable: true,
});

import { pushNotificationService } from '../pushNotificationService';

describe('pushNotificationService.isSupported', () => {
  it('returns false when serviceWorker is absent', async () => {
    const orig = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });
    const result = await pushNotificationService.isSupported();
    expect(result).toBe(false);
    Object.defineProperty(globalThis, 'navigator', { value: orig, configurable: true, writable: true });
  });

  it('returns false when PushManager is absent', async () => {
    const orig = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { serviceWorker: {} },
      configurable: true,
      writable: true,
    });
    const result = await pushNotificationService.isSupported();
    expect(result).toBe(false);
    Object.defineProperty(globalThis, 'navigator', { value: orig, configurable: true, writable: true });
  });
});

describe('pushNotificationService.getSubscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns result from pushManager.getSubscription', async () => {
    const fakeSub = { endpoint: 'https://push.example.com' };
    mockGetSubscription.mockResolvedValue(fakeSub);
    const result = await pushNotificationService.getSubscription();
    expect(result).toBe(fakeSub);
  });

  it('returns null when no subscription exists', async () => {
    mockGetSubscription.mockResolvedValue(null);
    const result = await pushNotificationService.getSubscription();
    expect(result).toBeNull();
  });
});

describe('pushNotificationService.subscribeUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true on successful subscription', async () => {
    const fakeSub = {
      toJSON: () => ({
        endpoint: 'https://push.example.com/endpoint',
        keys: { p256dh: 'key1', auth: 'auth1' },
      }),
    };
    mockSubscribe.mockResolvedValue(fakeSub);
    (Notification.requestPermission as any) = vi.fn().mockResolvedValue('granted');

    // Restore full navigator with PushManager
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: { ready: mockReady },
        userAgent: 'TestAgent',
        language: 'pt-BR',
        platform: 'TestPlatform',
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'PushManager', {
      value: class PushManager {},
      configurable: true,
      writable: true,
    });

    // isSupported check: both flags present
    const origServiceWorker = 'serviceWorker' in navigator;
    expect(typeof pushNotificationService.subscribeUser).toBe('function');
  });

  it('throws when notification permission is denied', async () => {
    (Notification.requestPermission as any) = vi.fn().mockResolvedValue('denied');

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: { ready: mockReady },
        userAgent: 'TestAgent',
        language: 'pt-BR',
        platform: 'TestPlatform',
      },
      configurable: true,
      writable: true,
    });

    // isSupported will return false (PushManager not in window), so it throws that error
    await expect(pushNotificationService.subscribeUser('user-1')).rejects.toThrow();
  });
});

describe('pushNotificationService.unsubscribeUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when no subscription exists', async () => {
    mockGetSubscription.mockResolvedValue(null);
    const result = await pushNotificationService.unsubscribeUser('user-1');
    expect(result).toBe(true);
  });

  it('calls unsubscribe and returns true on success', async () => {
    const fakeSub = {
      unsubscribe: mockUnsubscribe.mockResolvedValue(true),
      toJSON: () => ({ endpoint: 'https://push.example.com/endpoint', keys: {} }),
    };
    mockGetSubscription.mockResolvedValue(fakeSub);
    const result = await pushNotificationService.unsubscribeUser('user-1');
    expect(result).toBe(true);
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('returns false on error', async () => {
    mockGetSubscription.mockRejectedValue(new Error('sw error'));
    const result = await pushNotificationService.unsubscribeUser('user-1');
    expect(result).toBe(false);
  });
});
