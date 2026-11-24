import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import { useQuery } from '@tanstack/react-query';
import { UserRolesTab } from '../settings/UserRolesTab';

const MOCK_ROLES = [
  { id: 'r1', user_id: 'user-abc-123', role: 'admin', created_at: '2024-01-15T10:00:00Z' },
  { id: 'r2', user_id: 'user-def-456', role: 'user', created_at: '2024-02-20T08:00:00Z' },
];

describe('UserRolesTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<UserRolesTab />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Perfis de Usuário title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<UserRolesTab />);
    expect(screen.getByText('Perfis de Usuário')).toBeInTheDocument();
  });

  it('shows empty state when no roles', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<UserRolesTab />);
    expect(screen.getByText('Nenhum perfil customizado configurado.')).toBeInTheDocument();
  });

  it('renders role badges', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ROLES, isLoading: false } as any);
    render(<UserRolesTab />);
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('renders user_id in table', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ROLES, isLoading: false } as any);
    render(<UserRolesTab />);
    expect(screen.getByText('user-abc-123')).toBeInTheDocument();
  });

  it('shows Tornar Admin for non-admin users', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ROLES, isLoading: false } as any);
    render(<UserRolesTab />);
    expect(screen.getByText('Tornar Admin')).toBeInTheDocument();
  });

  it('renders Informação de Segurança card', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<UserRolesTab />);
    expect(screen.getByText('Informação de Segurança')).toBeInTheDocument();
  });
});
