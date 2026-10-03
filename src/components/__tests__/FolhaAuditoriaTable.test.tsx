import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useFolhaAuditoria', () => ({
  useFolhaAuditoria: vi.fn(() => ({ logs: [], isLoading: false })),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children?: ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children?: ReactNode }) => <th>{children}</th>,
  TableCell: ({ children, colSpan }: { children?: ReactNode; colSpan?: number }) => (
    <td colSpan={colSpan}>{children}</td>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('date-fns', () => ({ format: vi.fn(() => '24/07/2026 14:30') }));
vi.mock('date-fns/locale', () => ({ ptBR: {} }));

import { FolhaAuditoriaTable } from '../folha/FolhaAuditoriaTable';

const MOCK_LOG = {
  id: 'l1',
  created_at: '2026-07-24T14:30:00Z',
  severidade: 'INFO' as const,
  tipo_evento: 'CALCULO_ITEM',
  mensagem: 'Item calculado com sucesso',
  colaborador: { nome_completo: 'Ana Lima' },
};

describe('FolhaAuditoriaTable', () => {
  it('renders filter input', () => {
    render(<FolhaAuditoriaTable folhaId="f-001" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders Data/Hora column header', () => {
    render(<FolhaAuditoriaTable folhaId="f-001" />);
    expect(screen.getByText('Data/Hora')).toBeInTheDocument();
  });

  it('renders Severidade column header', () => {
    render(<FolhaAuditoriaTable folhaId="f-001" />);
    expect(screen.getByText('Severidade')).toBeInTheDocument();
  });

  it('renders Evento column header', () => {
    render(<FolhaAuditoriaTable folhaId="f-001" />);
    expect(screen.getByText('Evento')).toBeInTheDocument();
  });

  it('renders Mensagem column header', () => {
    render(<FolhaAuditoriaTable folhaId="f-001" />);
    expect(screen.getByText('Mensagem')).toBeInTheDocument();
  });

  it('shows empty state when no logs', () => {
    render(<FolhaAuditoriaTable folhaId="f-001" />);
    expect(screen.getByText('Nenhum registro de auditoria encontrado.')).toBeInTheDocument();
  });

  it('shows loading text when loading', async () => {
    const { useFolhaAuditoria } = await import('@/hooks/useFolhaAuditoria');
    vi.mocked(useFolhaAuditoria).mockReturnValueOnce({ logs: [], isLoading: true } as never);
    render(<FolhaAuditoriaTable folhaId="f-001" />);
    expect(screen.getByText(/Carregando logs/i)).toBeInTheDocument();
  });

  it('renders log row when data provided', async () => {
    const { useFolhaAuditoria } = await import('@/hooks/useFolhaAuditoria');
    vi.mocked(useFolhaAuditoria).mockReturnValueOnce({ logs: [MOCK_LOG], isLoading: false } as never);
    render(<FolhaAuditoriaTable folhaId="f-001" />);
    expect(screen.getByText('Item calculado com sucesso')).toBeInTheDocument();
  });
});
