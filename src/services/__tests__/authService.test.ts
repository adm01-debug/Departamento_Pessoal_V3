import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockResetPasswordForEmail, mockUpdateUser, mockGetSession } = vi.hoisted(() => ({
  mockResetPasswordForEmail: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      getSession: mockGetSession,
    },
  },
}));

// Dynamic import so module is loaded after mocks
const { authService } = await import('../authService');

// stub window.location used in forgotPassword redirect
Object.defineProperty(window, 'location', {
  value: { origin: 'http://localhost' },
  writable: true,
});

describe('authService.forgotPassword', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns success when supabase auth succeeds', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const result = await authService.forgotPassword('test@example.com');
    expect(result).toEqual({ success: true });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/auth/callback') }),
    );
  });

  it('throws when supabase auth returns error', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'User not found' } });
    await expect(authService.forgotPassword('bad@example.com')).rejects.toThrow('User not found');
  });

  it('throws with fallback message when error has no message', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: {} });
    await expect(authService.forgotPassword('bad@example.com')).rejects.toThrow('Falha ao enviar email de recuperação');
  });
});

describe('authService.resetPassword', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns success when password update succeeds', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const result = await authService.resetPassword('newSecret123');
    expect(result).toEqual({ success: true });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newSecret123' });
  });

  it('throws when supabase auth returns error', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Weak password' } });
    await expect(authService.resetPassword('123')).rejects.toThrow('Weak password');
  });

  it('throws with fallback message when error has no message', async () => {
    mockUpdateUser.mockResolvedValue({ error: {} });
    await expect(authService.resetPassword('123')).rejects.toThrow('Falha ao atualizar senha');
  });
});

describe('authService.getSession', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns session when supabase auth returns session', async () => {
    const session = { user: { id: 'u1' }, access_token: 'tok' };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    const result = await authService.getSession();
    expect(result).toEqual(session);
  });

  it('returns null session when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    const result = await authService.getSession();
    expect(result).toBeNull();
  });

  it('throws when supabase auth returns error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid' } });
    await expect(authService.getSession()).rejects.toThrow('Sessão inválida ou expirada');
  });
});
