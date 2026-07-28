import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { mockUseAuth, mockGetAAL, mockListFactors } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockGetAAL: vi.fn(),
  mockListFactors: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }));
// ProtectedRoute consulta o AAL (MFA) na montagem; o mock global não expõe `auth.mfa`.
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

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

import { ProtectedRoute } from '../ProtectedRoute';

function renderRoute(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockGetAAL.mockReset().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
    mockListFactors.mockReset().mockResolvedValue({ data: { totp: [] }, error: null });
  });

  it('shows loading spinner while session is not ready', () => {
    mockUseAuth.mockReturnValue({ user: null, isReady: false, loading: true });
    renderRoute(<ProtectedRoute><div>content</div></ProtectedRoute>);
    expect(screen.queryByText('content')).toBeNull();
    expect(screen.getByText('Validando credenciais...')).toBeInTheDocument();
  });

  it('shows loading spinner when loading and user not yet available', () => {
    mockUseAuth.mockReturnValue({ user: null, isReady: true, loading: true });
    renderRoute(<ProtectedRoute><div>content</div></ProtectedRoute>);
    expect(screen.queryByText('content')).toBeNull();
    expect(screen.getByText('Validando credenciais...')).toBeInTheDocument();
  });

  it('redirects to /login when ready and user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, isReady: true, loading: false });
    renderRoute(<ProtectedRoute><div>protected content</div></ProtectedRoute>);
    expect(screen.queryByText('protected content')).toBeNull();
  });

  it('renders children when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: { id: '1', email: 'a@b.com' }, isReady: true, loading: false });
    renderRoute(<ProtectedRoute><div>protected content</div></ProtectedRoute>);
    // O gate de MFA (H19) é assíncrono: primeiro renderiza "Verificando...",
    // e só libera os filhos depois que o AAL resolve.
    expect(screen.getByText(/Verificando autenticação de dois fatores/i)).toBeInTheDocument();
    expect(await screen.findByText('protected content')).toBeInTheDocument();
  });

  it('exige TOTP quando a sessão está em aal1 com fator verificado', async () => {
    mockGetAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null });
    mockListFactors.mockResolvedValue({ data: { totp: [{ id: 'f1', status: 'verified' }] }, error: null });
    mockUseAuth.mockReturnValue({ user: { id: '1', email: 'a@b.com' }, isReady: true, loading: false });
    renderRoute(<ProtectedRoute><div>protected content</div></ProtectedRoute>);
    expect(await screen.findByText('Verificação em Dois Fatores')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).toBeNull();
  });

  it('fail-open: libera acesso se a consulta de AAL falhar', async () => {
    mockGetAAL.mockRejectedValue(new Error('network'));
    mockUseAuth.mockReturnValue({ user: { id: '1', email: 'a@b.com' }, isReady: true, loading: false });
    renderRoute(<ProtectedRoute><div>protected content</div></ProtectedRoute>);
    expect(await screen.findByText('protected content')).toBeInTheDocument();
  });
});
