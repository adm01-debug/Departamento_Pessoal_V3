import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
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
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => children,
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'empresa-1' } }),
}));

vi.mock('@/components/forms', () => ({
  FormSwitch: ({
    label,
    checked,
    onCheckedChange,
  }: {
    label?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      aria-label={label || 'switch'}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BeneficiosSettingsTab } from '../settings/BeneficiosSettingsTab';

const MOCK_REGRAS = [
  { id: 'b1', nome: 'VR Master', tipo: 'Alimentação', valor: 500, ativo: true },
  { id: 'b2', nome: 'Plano Saúde Plus', tipo: 'Saúde', valor: 200, ativo: false },
];

describe('BeneficiosSettingsTab', () => {
  it('renders Regras de Benefícios title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<BeneficiosSettingsTab />);
    expect(screen.getByText('Regras de Benefícios')).toBeInTheDocument();
  });

  it('renders Novo Plano button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<BeneficiosSettingsTab />);
    expect(screen.getByText('Novo Plano')).toBeInTheDocument();
  });

  it('renders beneficio names from query data', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_REGRAS, isLoading: false } as never);
    render(<BeneficiosSettingsTab />);
    expect(screen.getByText('VR Master')).toBeInTheDocument();
    expect(screen.getByText('Plano Saúde Plus')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<BeneficiosSettingsTab />);
    expect(screen.getByText('Plano')).toBeInTheDocument();
    expect(screen.getAllByText('Tipo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Valor').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders footer warning about folha impact', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<BeneficiosSettingsTab />);
    expect(screen.getByText(/próximos fechamentos de folha/)).toBeInTheDocument();
  });

  it('Excluir pede confirmação e exclui o plano filtrando pela empresa atual', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useMutation).mockReturnValue({ mutate, isPending: false } as never);
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_REGRAS, isLoading: false } as never);
    render(<BeneficiosSettingsTab />);

    await user.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);
    expect(screen.getByText('Excluir o plano VR Master?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(mutate).toHaveBeenCalledWith('b1');

    const opts = vi.mocked(useMutation).mock.calls.map((c) => c[0] as { mutationFn: (v: string) => Promise<void> });
    const eq = vi.fn().mockReturnThis();
    const select = vi.fn(async () => ({ data: [{ id: 'b1' }], error: null }));
    const chain = { delete: vi.fn(() => chain), eq: vi.fn((...a: unknown[]) => (eq(...a), chain)), select };
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    const excluir = opts[opts.length - 1].mutationFn;
    await excluir('b1');
    expect(supabase.from).toHaveBeenCalledWith('beneficios');
    expect(chain.delete).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', 'b1');
    expect(eq).toHaveBeenCalledWith('empresa_id', 'empresa-1');
    expect(select).toHaveBeenCalledWith('id');

    // Plano de outra empresa (0 linhas afetadas) não pode virar "Plano excluído".
    select.mockResolvedValueOnce({ data: [], error: null });
    await expect(excluir('b1')).rejects.toThrow(/não pertence à empresa selecionada/);
  });

  it('shows dialog when Novo Plano clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<BeneficiosSettingsTab />);
    await user.click(screen.getByText('Novo Plano'));
    expect(screen.getByText('Novo Plano de Benefício')).toBeInTheDocument();
  });
});
