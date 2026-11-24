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
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: ({ size }: any) => <div data-testid="spinner" data-size={size} />,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <input type="checkbox" role="switch" checked={checked} onChange={e => onCheckedChange(e.target.checked)} />
  ),
}));

import { useQuery } from '@tanstack/react-query';
import { IPBlockingTab } from '../settings/IPBlockingTab';

const MOCK_IPS = [
  { id: 'i1', ip_address: '192.168.1.100', reason: 'Tentativa de força bruta', permanent: true, expires_at: null },
  { id: 'i2', ip_address: '10.0.0.5', reason: null, permanent: false, expires_at: '2099-12-31T23:59:59Z' },
];

describe('IPBlockingTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<IPBlockingTab />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders IPs Bloqueados title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<IPBlockingTab />);
    expect(screen.getByText('IPs Bloqueados')).toBeInTheDocument();
  });

  it('renders Bloquear IP button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<IPBlockingTab />);
    expect(screen.getAllByText('Bloquear IP').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no ips', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<IPBlockingTab />);
    expect(screen.getByText('Nenhum IP bloqueado')).toBeInTheDocument();
  });

  it('renders stat labels', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_IPS, isLoading: false } as any);
    render(<IPBlockingTab />);
    expect(screen.getByText('Total Bloqueados')).toBeInTheDocument();
    expect(screen.getByText('Ativos')).toBeInTheDocument();
    expect(screen.getByText('Expirados')).toBeInTheDocument();
  });

  it('renders ip_address in table', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_IPS, isLoading: false } as any);
    render(<IPBlockingTab />);
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
  });

  it('renders Permanente and Temporário badges', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_IPS, isLoading: false } as any);
    render(<IPBlockingTab />);
    expect(screen.getByText('Permanente')).toBeInTheDocument();
    expect(screen.getByText('Temporário')).toBeInTheDocument();
  });
});
