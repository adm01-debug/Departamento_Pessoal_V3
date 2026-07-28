import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { mockUseAuth, mockGetAAL, mockListFactors } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockGetAAL: vi.fn(),
  mockListFactors: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }));
// AdminRoute exige MFA (fail-closed): o mock global não expõe `auth.mfa`.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: mockGetAAL,
        listFactors: mockListFactors,
        challengeAndVerify: vi.fn(),
      },
    },
  },
}));

import { AdminRoute } from '../AdminRoute';

function renderRoute(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AdminRoute', () => {
  beforeEach(() => {
    mockGetAAL.mockReset().mockResolvedValue({ data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null });
    mockListFactors.mockReset().mockResolvedValue({ data: { totp: [] }, error: null });
  });

  it('shows loading spinner while not ready', () => {
    mockUseAuth.mockReturnValue({ user: null, isReady: false, loading: true, isAdmin: false });
    renderRoute(<AdminRoute><div>admin content</div></AdminRoute>);
    expect(screen.queryByText('admin content')).toBeNull();
    expect(screen.getByText('Verificando privilégios...')).toBeInTheDocument();
  });

  it('redirects to /login when no user', () => {
    mockUseAuth.mockReturnValue({ user: null, isReady: true, loading: false, isAdmin: false });
    renderRoute(<AdminRoute><div>admin content</div></AdminRoute>);
    expect(screen.queryByText('admin content')).toBeNull();
  });

  it('shows access denied when user is not admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1' }, isReady: true, loading: false, isAdmin: false });
    renderRoute(<AdminRoute><div>admin content</div></AdminRoute>);
    expect(screen.queryByText('admin content')).toBeNull();
    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
  });

  it('renders children when user is admin com sessão aal2', async () => {
    mockUseAuth.mockReturnValue({ user: { id: '1' }, isReady: true, loading: false, isAdmin: true });
    renderRoute(<AdminRoute><div>admin content</div></AdminRoute>);
    expect(await screen.findByText('admin content')).toBeInTheDocument();
  });

  it('fail-closed: bloqueia admin quando a verificação de MFA falha', async () => {
    mockGetAAL.mockRejectedValue(new Error('network'));
    mockUseAuth.mockReturnValue({ user: { id: '1' }, isReady: true, loading: false, isAdmin: true });
    renderRoute(<AdminRoute><div>admin content</div></AdminRoute>);
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByText('admin content')).toBeNull();
  });

  it('exige desafio TOTP quando admin está em aal1 com fator verificado', async () => {
    mockGetAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null });
    mockListFactors.mockResolvedValue({ data: { totp: [{ id: 'f1', status: 'verified' }] }, error: null });
    mockUseAuth.mockReturnValue({ user: { id: '1' }, isReady: true, loading: false, isAdmin: true });
    renderRoute(<AdminRoute><div>admin content</div></AdminRoute>);
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByText('admin content')).toBeNull();
  });
});
