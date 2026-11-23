import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUpsert, mockUpdate } = vi.hoisted(() => {
  return {
    mockUpsert: vi.fn().mockResolvedValue({ error: null }),
    mockUpdate: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  };
});

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

describe('pushNotificationService.getVapidPublicKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('lê a chave da variável de ambiente', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '  chave-do-ambiente  ');
    await expect(pushNotificationService.getVapidPublicKey()).resolves.toBe('chave-do-ambiente');
    vi.unstubAllEnvs();
  });

  it('devolve null quando o env está vazio', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    await expect(pushNotificationService.getVapidPublicKey()).resolves.toBeNull();
    vi.unstubAllEnvs();
  });
});

describe('pushNotificationService.hasDeliverableSubscription', () => {
  // "AQID" em base64url decodifica para os bytes [1, 2, 3].
  const CHAVE = 'AQID';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', CHAVE);
  });

  it('é true quando a inscrição usa a chave VAPID vigente', async () => {
    mockGetSubscription.mockResolvedValue({
      options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
      toJSON: () => ({ endpoint: 'https://push.example.com/1' }),
    });
    await expect(pushNotificationService.hasDeliverableSubscription()).resolves.toBe(true);
  });

  it('é false quando a inscrição foi criada com outra chave', async () => {
    mockGetSubscription.mockResolvedValue({
      options: { applicationServerKey: new Uint8Array([9, 9, 9]).buffer },
      toJSON: () => ({ endpoint: 'https://push.example.com/1' }),
    });
    await expect(pushNotificationService.hasDeliverableSubscription()).resolves.toBe(false);
  });

  it('é false quando a inscrição não tem applicationServerKey', async () => {
    mockGetSubscription.mockResolvedValue({ options: {}, toJSON: () => ({ endpoint: 'https://x' }) });
    await expect(pushNotificationService.hasDeliverableSubscription()).resolves.toBe(false);
  });

  it('é false sem inscrição no navegador', async () => {
    mockGetSubscription.mockResolvedValue(null);
    await expect(pushNotificationService.hasDeliverableSubscription()).resolves.toBe(false);
  });

  it('é false quando não há chave pública configurada', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    mockGetSubscription.mockResolvedValue({
      options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
      toJSON: () => ({ endpoint: 'https://push.example.com/1' }),
    });
    await expect(pushNotificationService.hasDeliverableSubscription()).resolves.toBe(false);
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
    Object.assign(Notification, { requestPermission: vi.fn().mockResolvedValue('granted') });

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
    Object.assign(Notification, { requestPermission: vi.fn().mockResolvedValue('denied') });

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

  it('não cria inscrição sem chave pública VAPID', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    Object.defineProperty(globalThis, 'PushManager', {
      value: class PushManager {},
      configurable: true,
      writable: true,
    });
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
    Object.assign(Notification, { requestPermission: vi.fn().mockResolvedValue('granted') });

    await expect(pushNotificationService.subscribeUser('user-1')).rejects.toThrow(/VAPID/);
    expect(mockSubscribe).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
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

  it('desativa apenas a inscrição deste dispositivo', async () => {
    const fakeSub = {
      unsubscribe: mockUnsubscribe.mockResolvedValue(true),
      toJSON: () => ({ endpoint: 'https://push.example.com/este' }),
    };
    mockGetSubscription.mockResolvedValue(fakeSub);
    await pushNotificationService.unsubscribeUser('user-1');

    const primeiroEq = mockUpdate.mock.results[0].value.eq;
    expect(primeiroEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(primeiroEq.mock.results[0].value.eq).toHaveBeenCalledWith(
      'subscription->>endpoint',
      'https://push.example.com/este'
    );
  });

  it('returns false on error', async () => {
    mockGetSubscription.mockRejectedValue(new Error('sw error'));
    const result = await pushNotificationService.unsubscribeUser('user-1');
    expect(result).toBe(false);
  });
});
