import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }));
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

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1', email: 'a@b.com' }, isReady: true, loading: false });
    renderRoute(<ProtectedRoute><div>protected content</div></ProtectedRoute>);
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});
