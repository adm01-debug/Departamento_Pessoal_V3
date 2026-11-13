import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import { lovable } from '@/integrations/lovable/index';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signIn: vi.fn(), resetPassword: vi.fn(), loading: false }),
}));
vi.mock('@/integrations/lovable/index', () => ({
  lovable: { auth: { signInWithOAuth: vi.fn().mockResolvedValue({}) } },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));
vi.mock('@/hooks/useBruteForceProtection', () => ({
  useBruteForceProtection: () => ({
    lockState: { isLocked: false, remainingSeconds: 0, attempts: 0 },
    checkLock: vi.fn(),
    recordFailedAttempt: vi.fn(),
    resetAttempts: vi.fn(),
    applyServerLock: vi.fn(),
  }),
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

describe('LoginPage — botão Google condicionado a VITE_AUTH_GOOGLE_ENABLED', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('oculta o Google e deixa o Gov.br em largura total quando a flag está ausente', () => {
    vi.stubEnv('VITE_AUTH_GOOGLE_ENABLED', '');
    renderLogin();

    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    const govBr = screen.getByRole('button', { name: /gov\.br/i });
    expect(govBr.parentElement).toHaveClass('grid-cols-1');
    expect(govBr.parentElement).not.toHaveClass('grid-cols-2');
  });

  it('oculta o Google para qualquer valor diferente de "true"', () => {
    vi.stubEnv('VITE_AUTH_GOOGLE_ENABLED', 'false');
    renderLogin();

    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gov\.br/i })).toBeInTheDocument();
  });

  it('mostra o Google lado a lado com o Gov.br e inicia o OAuth quando a flag é "true"', () => {
    vi.stubEnv('VITE_AUTH_GOOGLE_ENABLED', 'true');
    renderLogin();

    const google = screen.getByRole('button', { name: /google/i });
    const govBr = screen.getByRole('button', { name: /gov\.br/i });
    expect(google.parentElement).toBe(govBr.parentElement);
    expect(govBr.parentElement).toHaveClass('grid-cols-2');

    fireEvent.click(google);
    expect(lovable.auth.signInWithOAuth).toHaveBeenCalledWith('google', expect.anything());
  });
});
