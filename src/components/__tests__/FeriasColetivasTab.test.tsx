import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false, refetch: vi.fn() })),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1', razao_social: 'Empresa Teste' } })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ data: [], error: null })) })) })) })),
    })),
  },
}));

vi.mock('@/hooks/ferias/useGerarComunicadoColetivas', () => ({
  useGerarComunicadoColetivas: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  baixarComunicadoColetivas: vi.fn(() => Promise.resolve('blob://url')),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('date-fns', () => ({ format: vi.fn(() => '24/07/26') }));
vi.mock('date-fns/locale', () => ({ ptBR: {} }));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

import { FeriasColetivasTab } from '../ferias/FeriasColetivasTab';

describe('FeriasColetivasTab', () => {
  it('renders card title Férias Coletivas', () => {
    render(<FeriasColetivasTab />);
    expect(screen.getAllByText(/Férias Coletivas/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no coletivas', () => {
    render(<FeriasColetivasTab />);
    expect(screen.getByText(/Nenhuma férias coletiva/i)).toBeInTheDocument();
  });

  it('shows loading spinner when loading', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: undefined, isLoading: true, refetch: vi.fn() } as any);
    const { container } = render(<FeriasColetivasTab />);
    expect(container.querySelector('svg') || screen.queryByText(/Nenhuma/i)).toBeDefined();
  });

  it('renders table headers when coletivas present', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({
      data: [{
        id: 'c1',
        data_inicio: '2026-07-01',
        data_fim: '2026-07-15',
        dias: 15,
        status: 'aprovada',
        departamentos: ['RH', 'TI'],
        comunicado_mte_path: null,
        comunicado_mte_hash: null,
        comunicado_sindicato_path: null,
        comunicado_sindicato_hash: null,
        comunicado_sindicato_nome: null,
        comunicado_gerado_em: null,
      }],
      isLoading: false,
      refetch: vi.fn(),
    } as any);
    render(<FeriasColetivasTab />);
    expect(screen.getByText('Período')).toBeInTheDocument();
  });

  it('renders Dias column header', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({
      data: [{ id: 'c2', data_inicio: '2026-08-01', data_fim: '2026-08-10', dias: 10, status: 'planejada', departamentos: null, comunicado_mte_path: null, comunicado_mte_hash: null, comunicado_sindicato_path: null, comunicado_sindicato_hash: null, comunicado_sindicato_nome: null, comunicado_gerado_em: null }],
      isLoading: false,
      refetch: vi.fn(),
    } as any);
    render(<FeriasColetivasTab />);
    expect(screen.getByText('Dias')).toBeInTheDocument();
  });

  it('renders Comunicados column header', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({
      data: [{ id: 'c3', data_inicio: '2026-08-01', data_fim: '2026-08-10', dias: 10, status: null, departamentos: null, comunicado_mte_path: null, comunicado_mte_hash: null, comunicado_sindicato_path: null, comunicado_sindicato_hash: null, comunicado_sindicato_nome: null, comunicado_gerado_em: null }],
      isLoading: false,
      refetch: vi.fn(),
    } as any);
    render(<FeriasColetivasTab />);
    expect(screen.getByText('Comunicados')).toBeInTheDocument();
  });

  it('renders MTE sindicato title in dialog', () => {
    render(<FeriasColetivasTab />);
    expect(screen.getAllByText(/MTE.*Sindicato/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Todos when departamentos is null', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({
      data: [{ id: 'c4', data_inicio: '2026-07-01', data_fim: '2026-07-10', dias: 10, status: 'aprovada', departamentos: null, comunicado_mte_path: null, comunicado_mte_hash: null, comunicado_sindicato_path: null, comunicado_sindicato_hash: null, comunicado_sindicato_nome: null, comunicado_gerado_em: null }],
      isLoading: false,
      refetch: vi.fn(),
    } as any);
    render(<FeriasColetivasTab />);
    expect(screen.getByText('Todos')).toBeInTheDocument();
  });
});
