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
    auth: {
      mfa: {
        listFactors: vi.fn(),
        enroll: vi.fn(),
        challenge: vi.fn(),
        verify: vi.fn(),
        unenroll: vi.fn(),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-123' } })),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

import { useQuery } from '@tanstack/react-query';
import { MFASetup } from '../settings/MFASetup';

describe('MFASetup', () => {
  it('shows loading spinner when loading', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = render(<MFASetup />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders 2FA title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: { totp: [] }, isLoading: false } as any);
    render(<MFASetup />);
    expect(screen.getByText(/Autenticação de Dois Fatores/)).toBeInTheDocument();
  });

  it('shows Desativado badge when no factors', () => {
    vi.mocked(useQuery).mockReturnValue({ data: { totp: [] }, isLoading: false } as any);
    render(<MFASetup />);
    expect(screen.getByText('Desativado')).toBeInTheDocument();
  });

  it('shows Ativar 2FA button when disabled', () => {
    vi.mocked(useQuery).mockReturnValue({ data: { totp: [] }, isLoading: false } as any);
    render(<MFASetup />);
    expect(screen.getByText('Ativar 2FA')).toBeInTheDocument();
  });

  it('shows Ativado badge when factor is verified', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { totp: [{ id: 'f1', status: 'verified', created_at: '2024-01-01T00:00:00Z', friendly_name: 'App' }] },
      isLoading: false,
    } as any);
    render(<MFASetup />);
    expect(screen.getByText('Ativado')).toBeInTheDocument();
  });

  it('shows Desativar button when MFA is active', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { totp: [{ id: 'f1', status: 'verified', created_at: '2024-01-01T00:00:00Z', friendly_name: 'App' }] },
      isLoading: false,
    } as any);
    render(<MFASetup />);
    expect(screen.getByText('Desativar')).toBeInTheDocument();
  });

  it('renders Dicas de Segurança section', () => {
    vi.mocked(useQuery).mockReturnValue({ data: { totp: [] }, isLoading: false } as any);
    render(<MFASetup />);
    expect(screen.getByText('Dicas de Segurança')).toBeInTheDocument();
  });

  it('renders App Autenticador description', () => {
    vi.mocked(useQuery).mockReturnValue({ data: { totp: [] }, isLoading: false } as any);
    render(<MFASetup />);
    expect(screen.getByText('App Autenticador (TOTP)')).toBeInTheDocument();
  });
});
