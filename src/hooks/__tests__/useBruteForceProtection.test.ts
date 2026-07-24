import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBruteForceProtection } from '../useBruteForceProtection';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
const mockRpc = supabase.rpc as ReturnType<typeof vi.fn>;

describe('useBruteForceProtection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts unlocked with zero attempts', () => {
      const { result } = renderHook(() => useBruteForceProtection());
      expect(result.current.lockState).toEqual({
        isLocked: false,
        remainingSeconds: 0,
        attempts: 0,
      });
    });
  });

  describe('checkLock', () => {
    it('returns false when user is not locked', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ is_locked: false, remaining_seconds: 0 }],
        error: null,
      });

      const { result } = renderHook(() => useBruteForceProtection());
      let locked: boolean;

      await act(async () => {
        locked = await result.current.checkLock('user@test.com');
      });

      expect(locked!).toBe(false);
      expect(result.current.lockState.isLocked).toBe(false);
    });

    it('returns true and updates state when user is locked', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ is_locked: true, remaining_seconds: 300 }],
        error: null,
      });

      const { result } = renderHook(() => useBruteForceProtection());
      let locked: boolean;

      await act(async () => {
        locked = await result.current.checkLock('locked@test.com');
      });

      expect(locked!).toBe(true);
      expect(result.current.lockState.isLocked).toBe(true);
      expect(result.current.lockState.remainingSeconds).toBe(300);
    });

    it('lowercases the email before sending', async () => {
      mockRpc.mockResolvedValueOnce({ data: [{ is_locked: false }], error: null });

      const { result } = renderHook(() => useBruteForceProtection());
      await act(async () => {
        await result.current.checkLock('User@Test.COM');
      });

      expect(mockRpc).toHaveBeenCalledWith('check_login_lock', {
        p_identifier: 'user@test.com',
        p_identifier_type: 'email',
      });
    });

    it('fails open (returns false) when RPC throws', async () => {
      mockRpc.mockRejectedValueOnce(new Error('network error'));

      const { result } = renderHook(() => useBruteForceProtection());
      let locked: boolean;

      await act(async () => {
        locked = await result.current.checkLock('user@test.com');
      });

      expect(locked!).toBe(false);
    });

    it('returns false for empty email without calling RPC', async () => {
      const { result } = renderHook(() => useBruteForceProtection());
      let locked: boolean;

      await act(async () => {
        locked = await result.current.checkLock('');
      });

      expect(locked!).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('handles non-array response (single object)', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { is_locked: true, remaining_seconds: 60 },
        error: null,
      });

      const { result } = renderHook(() => useBruteForceProtection());
      let locked: boolean;

      await act(async () => {
        locked = await result.current.checkLock('user@test.com');
      });

      expect(locked!).toBe(true);
      expect(result.current.lockState.remainingSeconds).toBe(60);
    });
  });

  describe('recordFailedAttempt', () => {
    it('updates state after recording failure', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ attempts: 3, is_locked: false, lockout_minutes: 0 }],
        error: null,
      });

      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        await result.current.recordFailedAttempt('user@test.com');
      });

      expect(result.current.lockState.attempts).toBe(3);
      expect(result.current.lockState.isLocked).toBe(false);
    });

    it('shows lockout when threshold exceeded', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ attempts: 5, is_locked: true, lockout_minutes: 5 }],
        error: null,
      });

      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        await result.current.recordFailedAttempt('user@test.com');
      });

      expect(result.current.lockState.isLocked).toBe(true);
      expect(result.current.lockState.remainingSeconds).toBe(300);
    });

    it('does nothing for empty email', async () => {
      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        await result.current.recordFailedAttempt('');
      });

      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('resetAttempts', () => {
    it('resets lockState to initial on success', async () => {
      mockRpc.mockResolvedValueOnce({ data: [{ is_locked: true, remaining_seconds: 300 }], error: null });
      mockRpc.mockResolvedValueOnce({ error: null });

      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        await result.current.checkLock('user@test.com');
      });

      expect(result.current.lockState.isLocked).toBe(true);

      await act(async () => {
        await result.current.resetAttempts('user@test.com');
      });

      expect(result.current.lockState).toEqual({
        isLocked: false,
        remainingSeconds: 0,
        attempts: 0,
      });
    });

    it('does nothing for empty email', async () => {
      const { result } = renderHook(() => useBruteForceProtection());

      await act(async () => {
        await result.current.resetAttempts('');
      });

      expect(mockRpc).not.toHaveBeenCalled();
    });
  });
});
