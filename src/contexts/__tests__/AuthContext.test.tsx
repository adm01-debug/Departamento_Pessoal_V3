import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

const { mockGetSession, mockSignInWithPassword, mockSignOut, mockSignUp,
  mockResetPasswordForEmail, mockOnAuthStateChange, mockRpc } = vi.hoisted(() => {
  const mockSubscription = { unsubscribe: vi.fn() };
  const mockOnAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: mockSubscription } });
  return {
    mockGetSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    mockSignInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    mockSignOut: vi.fn().mockResolvedValue({ error: null }),
    mockSignUp: vi.fn().mockResolvedValue({ error: null }),
    mockResetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    mockOnAuthStateChange,
    mockRpc: vi.fn().mockResolvedValue({ data: ['admin'], error: null }),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      onAuthStateChange: mockOnAuthStateChange,
    },
    rpc: mockRpc,
  },
}));

vi.mock('@/services/loggerService', () => ({
  loggerService: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('dompurify', () => ({
  default: { sanitize: (s: string) => s },
}));

import { AuthProvider, useAuth } from '../AuthContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mockRpc.mockResolvedValue({ data: ['user'], error: null });
  });

  it('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within AuthProvider'
    );
  });

  it('provides initial user=null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('loading is false after initialization completes', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('isAdmin is false when user is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it('hasRole returns false when user is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasRole('admin')).toBe(false);
  });

  it('signIn calls supabase.auth.signInWithPassword', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signIn('user@test.com', 'pass123');
    });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'pass123',
    });
  });

  it('signIn throws when supabase returns error', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: new Error('Invalid credentials') });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(
      act(async () => { await result.current.signIn('bad@test.com', 'wrong'); })
    ).rejects.toThrow('Invalid credentials');
  });

  it('signOut calls supabase.auth.signOut', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.signOut(); });
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('signUp calls supabase.auth.signUp with name in metadata', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signUp('new@test.com', 'pass', 'New User');
    });
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@test.com', options: expect.objectContaining({ data: { name: 'New User' } }) })
    );
  });

  it('resetPassword calls supabase.auth.resetPasswordForEmail', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.resetPassword('user@test.com'); });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@test.com', expect.any(Object));
  });

  it('onAuthStateChange is called on mount', () => {
    renderHook(() => useAuth(), { wrapper });
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });
});
