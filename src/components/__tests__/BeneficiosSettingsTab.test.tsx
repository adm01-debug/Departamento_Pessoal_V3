import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/components/forms', () => ({
  FormSwitch: ({ label, checked, onCheckedChange }: any) => (
    <input type="checkbox" aria-label={label || 'switch'} checked={checked} onChange={e => onCheckedChange(e.target.checked)} />
  ),
}));

import { useQuery } from '@tanstack/react-query';
import { BeneficiosSettingsTab } from '../settings/BeneficiosSettingsTab';

const MOCK_REGRAS = [
  { id: 'b1', nome: 'VR Master', tipo: 'Alimentação', valor: 500, ativo: true },
  { id: 'b2', nome: 'Plano Saúde Plus', tipo: 'Saúde', valor: 200, ativo: false },
];

describe('BeneficiosSettingsTab', () => {
  it('renders Regras de Benefícios title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<BeneficiosSettingsTab />);
    expect(screen.getByText('Regras de Benefícios')).toBeInTheDocument();
  });

  it('renders Novo Plano button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<BeneficiosSettingsTab />);
    expect(screen.getByText('Novo Plano')).toBeInTheDocument();
  });

  it('renders beneficio names from query data', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_REGRAS, isLoading: false } as any);
    render(<BeneficiosSettingsTab />);
    expect(screen.getByText('VR Master')).toBeInTheDocument();
    expect(screen.getByText('Plano Saúde Plus')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<BeneficiosSettingsTab />);
    expect(screen.getByText('Plano')).toBeInTheDocument();
    expect(screen.getAllByText('Tipo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Valor').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders footer warning about folha impact', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<BeneficiosSettingsTab />);
    expect(screen.getByText(/próximos fechamentos de folha/)).toBeInTheDocument();
  });

  it('shows dialog when Novo Plano clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<BeneficiosSettingsTab />);
    await user.click(screen.getByText('Novo Plano'));
    expect(screen.getByText('Novo Plano de Benefício')).toBeInTheDocument();
  });
});
