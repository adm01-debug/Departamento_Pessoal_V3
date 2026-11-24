import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

const {
  mockGetSession,
  mockSignInWithPassword,
  mockSignOut,
  mockSignUp,
  mockResetPasswordForEmail,
  mockOnAuthStateChange,
  mockRpc,
  mockSetSession,
  mockGetAAL,
  mockListFactors,
} = vi.hoisted(() => {
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
    mockSetSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    mockGetAAL: vi.fn().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }),
    mockListFactors: vi.fn().mockResolvedValue({ data: { totp: [] }, error: null }),
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
      setSession: mockSetSession,
      mfa: {
        getAuthenticatorAssuranceLevel: mockGetAAL,
        listFactors: mockListFactors,
      },
    },
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
      }),
    }),
    rpc: mockRpc,
  },
}));

vi.mock('@/services/loggerService', () => ({
  loggerService: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/passwordPolicy', () => ({
  validatePasswordFull: vi.fn(async (pw: string) =>
    pw.length >= 8
      ? { valid: true, errors: [], warnings: [] }
      : { valid: false, errors: ['Mínimo de 8 caracteres'], warnings: [] }
  ),
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
    mockSetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'at-direct',
          refresh_token: 'rt-direct',
          user: { id: 'direct-user', email: 'user@test.com' },
        },
        user: { id: 'direct-user', email: 'user@test.com' },
      },
      error: null,
    });
    mockGetAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
    // H20: signIn é roteado pela edge function `auth-login` (rate limit + lockout
    // server-side). O teste precisa simular a resposta HTTP, não o SDK direto.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            session: { access_token: 'at', refresh_token: 'rt' },
          }),
        json: async () => ({
          success: true,
          session: { access_token: 'at', refresh_token: 'rt' },
        }),
      })
    );
  });

  it('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
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

  it('signIn roteia pela edge function auth-login e hidrata a sessão', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signIn('user@test.com', 'pass123');
    });
    const [url, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/functions/v1/auth-login');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      email: 'user@test.com',
      password: 'pass123',
    });
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' });
    // Nunca deve chamar o SDK direto — isso burlaria o rate limit server-side.
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('signIn lança erro quando a edge function rejeita as credenciais', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ success: false, error: 'Credenciais inválidas.' }),
        json: async () => ({ success: false, error: 'Credenciais inválidas.' }),
      })
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(
      act(async () => {
        await result.current.signIn('bad@test.com', 'wrong');
      })
    ).rejects.toThrow('Credenciais inválidas.');
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('signIn propaga bloqueio de conta (429 / ACCOUNT_LOCKED)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () =>
          JSON.stringify({ success: false, code: 'ACCOUNT_LOCKED', error: 'Conta bloqueada por 15 minutos.' }),
        json: async () => ({ success: false, code: 'ACCOUNT_LOCKED', error: 'Conta bloqueada por 15 minutos.' }),
      })
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(
      act(async () => {
        await result.current.signIn('bad@test.com', 'wrong');
      })
    ).rejects.toThrow('Conta bloqueada por 15 minutos.');
  });

  it('signIn usa fallback no GoTrue quando a edge auth-login está fora do ar', async () => {
    // Alvo do proxy inacessível (ex.: edge function indisponível): o dev server
    // responde HTML 502. Em vez de bloquear o usuário com "servidor inacessível",
    // o login segue direto ao GoTrue, que é o mesmo backend de credenciais.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => '<html>Bad Gateway</html>',
        json: async () => {
          throw new Error('not json');
        },
      })
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signIn('user@test.com', 'pass123');
    });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'pass123',
    });
    // O GoTrue já hidrata a sessão; não há token de edge para setSession.
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('signIn não trata 401 HTML de gateway/proxy como senha errada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => '<html>Unauthorized</html>',
        json: async () => {
          throw new Error('not json');
        },
      })
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signIn('user@test.com', 'pass123');
    });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'pass123',
    });
  });

  it('signIn distingue rede/backend quando edge e GoTrue estão inacessíveis', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    mockSignInWithPassword.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    let capturado: unknown;
    await act(async () => {
      try {
        await result.current.signIn('user@test.com', 'pass123');
      } catch (e) {
        capturado = e;
      }
    });
    expect((capturado as { code?: string }).code).toBe('NETWORK_ERROR');
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('signIn mantém INVALID_CREDENTIALS quando o fallback GoTrue rejeita a senha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
        json: async () => {
          throw new Error('not json');
        },
      })
    );
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: {
        name: 'AuthApiError',
        message: 'Invalid login credentials',
        status: 400,
        code: 'invalid_credentials',
      },
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    let capturado: unknown;
    await act(async () => {
      try {
        await result.current.signIn('bad@test.com', 'wrong');
      } catch (e) {
        capturado = e;
      }
    });
    expect((capturado as { code?: string }).code).toBe('INVALID_CREDENTIALS');
    expect((capturado as { status?: number }).status).toBe(400);
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('signIn interpreta erro aninhado (createErrorResponse) sem "[object Object]"', async () => {
    // Formato do _shared/contract.ts: { error: { code, message } } — antes gerava
    // new Error({...}) => "[object Object]" e a tela mascarava como credencial inválida.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' } }),
        json: async () => ({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' } }),
      })
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    let capturado: unknown;
    await act(async () => {
      try {
        await result.current.signIn('user@test.com', 'pass123');
      } catch (e) {
        capturado = e;
      }
    });
    expect((capturado as { code?: string }).code).toBe('INVALID_CREDENTIALS');
    expect(String((capturado as Error).message)).not.toContain('[object Object]');
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('signIn propaga limitação de tentativas (RATE_LIMIT_EXCEEDED) sem tratá-la como senha errada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ success: false, code: 'RATE_LIMIT_EXCEEDED', error: 'Rate limit excedido' }),
        json: async () => ({ success: false, code: 'RATE_LIMIT_EXCEEDED', error: 'Rate limit excedido' }),
      })
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    let capturado: unknown;
    await act(async () => {
      try {
        await result.current.signIn('user@test.com', 'pass123');
      } catch (e) {
        capturado = e;
      }
    });
    expect((capturado as { code?: string }).code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('signIn reporta falha ao criar a sessão como SESSION_ERROR', async () => {
    mockSetSession.mockResolvedValue({ data: { session: null }, error: { message: 'invalid token' } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    let capturado: unknown;
    await act(async () => {
      try {
        await result.current.signIn('user@test.com', 'pass123');
      } catch (e) {
        capturado = e;
      }
    });
    expect((capturado as { code?: string }).code).toBe('SESSION_ERROR');
  });

  it('signIn exige MFA quando o nextLevel é aal2', async () => {
    mockGetAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null });
    mockListFactors.mockResolvedValue({ data: { totp: [{ id: 'factor-1' }] }, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(
      act(async () => {
        await result.current.signIn('mfa@test.com', 'pass123');
      })
    ).rejects.toThrow('Autenticação de dois fatores necessária.');
  });

  it('signOut calls supabase.auth.signOut', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signOut();
    });
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('signUp calls supabase.auth.signUp with name in metadata', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signUp('new@test.com', 'Str0ng!Pass', 'New User');
    });
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@test.com',
        options: expect.objectContaining({ data: { name: 'New User' } }),
      })
    );
  });

  it('signUp rejeita senha fraca antes de chamar o backend', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(
      act(async () => {
        await result.current.signUp('new@test.com', 'pass', 'New User');
      })
    ).rejects.toThrow(/Senha fraca/);
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('resetPassword calls supabase.auth.resetPasswordForEmail', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.resetPassword('user@test.com');
    });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@test.com', expect.any(Object));
  });

  it('onAuthStateChange is called on mount', () => {
    renderHook(() => useAuth(), { wrapper });
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });
});
