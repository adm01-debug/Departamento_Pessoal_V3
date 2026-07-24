import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }));

import { AdminRoute } from '../AdminRoute';

function renderRoute(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AdminRoute', () => {
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

  it('renders children when user is admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1' }, isReady: true, loading: false, isAdmin: true });
    renderRoute(<AdminRoute><div>admin content</div></AdminRoute>);
    expect(screen.getByText('admin content')).toBeInTheDocument();
  });
});
