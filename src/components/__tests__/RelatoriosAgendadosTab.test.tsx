import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: { children?: ReactNode }) => <div>{children}</div> },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any, fallback: string) => fallback),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children?: ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children?: ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children?: ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
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

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}));

import { useQuery } from '@tanstack/react-query';
import { RelatoriosAgendadosTab } from '../relatorios/RelatoriosAgendadosTab';

describe('RelatoriosAgendadosTab', () => {
  it('renders Relatórios Agendados heading', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<RelatoriosAgendadosTab empresaId="emp-1" />);
    expect(screen.getByText('Relatórios Agendados')).toBeInTheDocument();
  });

  it('renders Agendar Novo button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<RelatoriosAgendadosTab empresaId="emp-1" />);
    expect(screen.getByText(/Agendar Novo/i)).toBeInTheDocument();
  });

  it('shows empty state when no agendamentos', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<RelatoriosAgendadosTab empresaId="emp-1" />);
    expect(screen.getByText('Nenhum relatório agendado')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: true } as never);
    const { container } = render(<RelatoriosAgendadosTab empresaId="emp-1" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders Histórico de Entregas Automáticas section', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<RelatoriosAgendadosTab empresaId="emp-1" />);
    expect(screen.getByText(/Histórico de Entregas Automáticas/i)).toBeInTheDocument();
  });

  it('renders Novo Agendamento dialog title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<RelatoriosAgendadosTab empresaId="emp-1" />);
    expect(screen.getByText('Novo Agendamento')).toBeInTheDocument();
  });

  it('renders Nome do Agendamento label', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<RelatoriosAgendadosTab empresaId="emp-1" />);
    expect(screen.getByText('Nome do Agendamento')).toBeInTheDocument();
  });

  it('shows only confirmed history and never a sample delivery', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<RelatoriosAgendadosTab empresaId="emp-1" />);
    expect(screen.getByText('Histórico confirmado')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma entrega confirmada.')).toBeInTheDocument();
    expect(screen.queryByText('Exemplo: Headcount Semanal')).not.toBeInTheDocument();
  });

  it('renders agendamento card when data present', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [
        {
          id: 'ag-1',
          nome: 'Headcount Semanal',
          frequencia: 'semanal',
          hora_envio: '08:00',
          email_destinatario: 'rh@empresa.com',
          proximo_envio: null,
        },
      ],
      isLoading: false,
    } as never);
    render(<RelatoriosAgendadosTab empresaId="emp-1" />);
    expect(screen.getByText('Headcount Semanal')).toBeInTheDocument();
  });
});
