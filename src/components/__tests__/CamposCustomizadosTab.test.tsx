import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/hooks', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => children,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: ({ size }: { size?: string }) => <div data-testid="spinner" data-size={size} />,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => (
    <input type="checkbox" role="switch" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

import { useQuery } from '@tanstack/react-query';
import { CamposCustomizadosTab } from '../settings/CamposCustomizadosTab';

const MOCK_CAMPOS = [
  { id: 'c1', nome: 'Número do Crachá', tipo: 'texto', secao: 'dados_profissionais', obrigatorio: false, ativo: true },
  { id: 'c2', nome: 'Data Última Avaliação', tipo: 'data', secao: 'outros', obrigatorio: true, ativo: false },
];

describe('CamposCustomizadosTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true } as never);
    render(<CamposCustomizadosTab />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Campos Customizados title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<CamposCustomizadosTab />);
    expect(screen.getByText('Campos Customizados')).toBeInTheDocument();
  });

  it('renders Novo Campo button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<CamposCustomizadosTab />);
    expect(screen.getByText('Novo Campo')).toBeInTheDocument();
  });

  it('shows empty state when no campos', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<CamposCustomizadosTab />);
    expect(screen.getByText('Nenhum campo customizado criado')).toBeInTheDocument();
  });

  it('renders campo names in table', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_CAMPOS, isLoading: false } as never);
    render(<CamposCustomizadosTab />);
    expect(screen.getByText('Número do Crachá')).toBeInTheDocument();
    expect(screen.getByText('Data Última Avaliação')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_CAMPOS, isLoading: false } as never);
    render(<CamposCustomizadosTab />);
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getAllByText('Tipo').length).toBeGreaterThanOrEqual(1);
  });
});
