import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBackGesture } from '../useBackGesture';

const mockNavigate = vi.fn();
let mockPathname = '/colaboradores';

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

function fireSwipe(startX: number, endX: number, startY = 200, endY = 200) {
  window.dispatchEvent(new TouchEvent('touchstart', {
    touches: [{ clientX: startX, clientY: startY } as Touch],
  }));
  window.dispatchEvent(new TouchEvent('touchend', {
    changedTouches: [{ clientX: endX, clientY: endY } as Touch],
  }));
}

describe('useBackGesture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/colaboradores';
  });

  it('navigates back on left-edge swipe right', () => {
    renderHook(() => useBackGesture());
    fireSwipe(20, 130);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('does not navigate when swipe starts away from left edge', () => {
    renderHook(() => useBackGesture());
    fireSwipe(100, 250);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when horizontal distance is too small', () => {
    renderHook(() => useBackGesture());
    fireSwipe(20, 80);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when vertical deviation is too large', () => {
    renderHook(() => useBackGesture());
    fireSwipe(20, 130, 200, 270); // 70px vertical delta > threshold of 60
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate on disabled paths: /', () => {
    mockPathname = '/';
    renderHook(() => useBackGesture());
    fireSwipe(20, 130);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate on disabled paths: /dashboard', () => {
    mockPathname = '/dashboard';
    renderHook(() => useBackGesture());
    fireSwipe(20, 130);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate on disabled paths: /login', () => {
    mockPathname = '/login';
    renderHook(() => useBackGesture());
    fireSwipe(20, 130);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('removes event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useBackGesture());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
  });

  it('navigates exactly at 100px horizontal threshold', () => {
    renderHook(() => useBackGesture());
    // Start at x=20, end at x=120 → deltaX = 100 exactly (> 100 is false, so should NOT navigate)
    fireSwipe(20, 120);
    expect(mockNavigate).not.toHaveBeenCalled();

    // x=121 → deltaX = 101 → should navigate
    fireSwipe(20, 121);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('accepts vertical delta exactly at threshold', () => {
    renderHook(() => useBackGesture());
    // deltaY = 60 exactly (< 60 is false → should NOT navigate)
    fireSwipe(20, 130, 200, 260);
    expect(mockNavigate).not.toHaveBeenCalled();

    // deltaY = 59 → should navigate
    fireSwipe(20, 130, 200, 259);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
