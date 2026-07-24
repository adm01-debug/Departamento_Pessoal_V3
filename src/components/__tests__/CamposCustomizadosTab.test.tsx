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

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

import { useQuery } from '@tanstack/react-query';
import { CamposCustomizadosTab } from '../settings/CamposCustomizadosTab';

const MOCK_CAMPOS = [
  { id: 'c1', nome: 'Número do Crachá', tipo: 'texto', secao: 'dados_profissionais', obrigatorio: false, ativo: true },
  { id: 'c2', nome: 'Data Última Avaliação', tipo: 'data', secao: 'outros', obrigatorio: true, ativo: false },
];

describe('CamposCustomizadosTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<CamposCustomizadosTab />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Campos Customizados title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<CamposCustomizadosTab />);
    expect(screen.getByText('Campos Customizados')).toBeInTheDocument();
  });

  it('renders Novo Campo button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<CamposCustomizadosTab />);
    expect(screen.getByText('Novo Campo')).toBeInTheDocument();
  });

  it('shows empty state when no campos', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<CamposCustomizadosTab />);
    expect(screen.getByText('Nenhum campo customizado criado')).toBeInTheDocument();
  });

  it('renders campo names in table', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_CAMPOS, isLoading: false } as any);
    render(<CamposCustomizadosTab />);
    expect(screen.getByText('Número do Crachá')).toBeInTheDocument();
    expect(screen.getByText('Data Última Avaliação')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_CAMPOS, isLoading: false } as any);
    render(<CamposCustomizadosTab />);
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getAllByText('Tipo').length).toBeGreaterThanOrEqual(1);
  });
});
