import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseBlocker } = vi.hoisted(() => ({
  mockUseBlocker: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useBlocker: mockUseBlocker,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children?: ReactNode }) => children,
  AlertDialogContent: ({ children }: { children?: ReactNode }) => children,
  AlertDialogHeader: ({ children }: { children?: ReactNode }) => children,
  AlertDialogTitle: ({ children }: { children?: ReactNode }) => children,
  AlertDialogDescription: ({ children }: { children?: ReactNode }) => children,
  AlertDialogFooter: ({ children }: { children?: ReactNode }) => children,
  AlertDialogCancel: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogAction: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import { useNavigationGuard } from '../useNavigationGuard';

describe('useNavigationGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBlocker.mockReturnValue({ state: 'idle' });
  });

  it('registers beforeunload listener when enabled', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useNavigationGuard({ enabled: true }));
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('does not register beforeunload listener when disabled', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useNavigationGuard({ enabled: false }));
    expect(addSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('removes beforeunload listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useNavigationGuard({ enabled: true }));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('returns null NavigationGuardDialog when blocker state is idle', () => {
    mockUseBlocker.mockReturnValue({ state: 'idle' });
    const { result } = renderHook(() => useNavigationGuard({ enabled: true }));
    expect(result.current.NavigationGuardDialog).toBeNull();
  });

  it('returns dialog when blocker state is blocked', () => {
    mockUseBlocker.mockReturnValue({ state: 'blocked', reset: vi.fn(), proceed: vi.fn() });
    const { result } = renderHook(() => useNavigationGuard({ enabled: true }));
    expect(result.current.NavigationGuardDialog).not.toBeNull();
  });

  it('exposes blocker from useBlocker', () => {
    const blocker = { state: 'idle' as const };
    mockUseBlocker.mockReturnValue(blocker);
    const { result } = renderHook(() => useNavigationGuard({ enabled: true }));
    expect(result.current.blocker).toBe(blocker);
  });

  it('calls useBlocker with a function', () => {
    renderHook(() => useNavigationGuard({ enabled: true }));
    expect(mockUseBlocker).toHaveBeenCalledWith(expect.any(Function));
  });
});
