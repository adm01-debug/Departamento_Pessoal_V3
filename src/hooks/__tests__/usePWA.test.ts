import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePWA } from '../usePWA';

function mockMatchMedia(standaloneMatch: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi
      .fn()
      .mockReturnValue({ matches: standaloneMatch, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
}

function makeInstallPromptEvent() {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  Object.assign(event, { platforms: ['web'] });
  Object.assign(event, { userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }) });
  Object.assign(event, { prompt: vi.fn().mockResolvedValue(undefined) });
  return event;
}

describe('usePWA', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    Object.assign(window.navigator, { standalone: undefined });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts not installable and not installed', () => {
    const { result } = renderHook(() => usePWA());
    expect(result.current.isInstallable).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it('detects standalone display mode as installed', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => usePWA());
    expect(result.current.isInstalled).toBe(true);
  });

  it('detects navigator.standalone as installed (iOS)', () => {
    Object.assign(window.navigator, { standalone: true });
    const { result } = renderHook(() => usePWA());
    expect(result.current.isInstalled).toBe(true);
  });

  it('sets isInstallable true when beforeinstallprompt fires', () => {
    const { result } = renderHook(() => usePWA());

    act(() => {
      window.dispatchEvent(makeInstallPromptEvent());
    });

    expect(result.current.isInstallable).toBe(true);
  });

  it('sets isInstalled and clears installable on appinstalled event', () => {
    const { result } = renderHook(() => usePWA());

    act(() => {
      window.dispatchEvent(makeInstallPromptEvent());
    });
    expect(result.current.isInstallable).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.isInstallable).toBe(false);
  });

  it('installApp does nothing when no prompt stashed', async () => {
    const { result } = renderHook(() => usePWA());
    await act(async () => {
      await result.current.installApp();
    });
    // No errors thrown — installApp safely no-ops
  });

  it('installApp calls prompt and clears state after accepted', async () => {
    const { result } = renderHook(() => usePWA());
    const promptEvent = makeInstallPromptEvent();

    act(() => {
      window.dispatchEvent(promptEvent);
    });

    await act(async () => {
      await result.current.installApp();
    });

    expect((promptEvent as unknown as { prompt: unknown }).prompt).toHaveBeenCalled();
    expect(result.current.isInstallable).toBe(false);
  });

  it('removes event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => usePWA());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
  });
});
