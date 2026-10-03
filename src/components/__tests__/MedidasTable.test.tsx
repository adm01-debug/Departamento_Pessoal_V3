import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    tr: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
    div: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('date-fns', () => ({
  format: vi.fn(() => '01/01/2026'),
  parseISO: vi.fn((d: string) => new Date(d)),
}));

vi.mock('date-fns/locale', () => ({ ptBR: {} }));

vi.mock('@/utils/safeUrl', () => ({
  safeHref: vi.fn((url: string) => url),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children?: ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <td {...rest}>{children}</td>,
  TableHead: ({ children }: { children?: ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <tr {...rest}>{children}</tr>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

import { MedidasTable } from '../medidas-disciplinares/MedidasTable';
import type { MedidaDisciplinarComColaborador } from '@/types/medidasDisciplinares';

const MOCK_DATA = [
  {
    id: 'm1',
    numero_sequencial: 1,
    tipo: 'advertencia_escrita',
    data_ocorrencia: '2026-07-01',
    status_workflow: 'aguardando_rh',
    descricao: 'Atraso recorrente',
    base_legal: 'art_482_e',
    testemunha_1: 'Maria Santos',
    colaborador: { nome_completo: 'Carlos Oliveira' },
  },
] as unknown as MedidaDisciplinarComColaborador[];

describe('MedidasTable', () => {
  it('renders table column header Colaborador', () => {
    render(<MedidasTable data={MOCK_DATA} onMarcarCiencia={vi.fn()} onExcluir={vi.fn()} />);
    expect(screen.getAllByText('Colaborador').length).toBeGreaterThanOrEqual(1);
  });

  it('renders table column header Tipo', () => {
    render(<MedidasTable data={MOCK_DATA} onMarcarCiencia={vi.fn()} onExcluir={vi.fn()} />);
    expect(screen.getAllByText('Tipo').length).toBeGreaterThanOrEqual(1);
  });

  it('renders table column header Status', () => {
    render(<MedidasTable data={MOCK_DATA} onMarcarCiencia={vi.fn()} onExcluir={vi.fn()} />);
    expect(screen.getAllByText('Status').length).toBeGreaterThanOrEqual(1);
  });

  it('renders colaborador name from data', () => {
    render(<MedidasTable data={MOCK_DATA} onMarcarCiencia={vi.fn()} onExcluir={vi.fn()} />);
    expect(screen.getAllByText('Carlos Oliveira').length).toBeGreaterThanOrEqual(1);
  });

  it('renders tipo badge label', () => {
    render(<MedidasTable data={MOCK_DATA} onMarcarCiencia={vi.fn()} onExcluir={vi.fn()} />);
    expect(screen.getAllByText('Adv. Escrita').length).toBeGreaterThanOrEqual(1);
  });

  it('renders numero_sequencial', () => {
    render(<MedidasTable data={MOCK_DATA} onMarcarCiencia={vi.fn()} onExcluir={vi.fn()} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('renders with empty data without error', () => {
    expect(() => render(<MedidasTable data={[]} onMarcarCiencia={vi.fn()} onExcluir={vi.fn()} />)).not.toThrow();
  });

  it('renders Ações column header', () => {
    render(<MedidasTable data={MOCK_DATA} onMarcarCiencia={vi.fn()} onExcluir={vi.fn()} />);
    expect(screen.getByText('Ações')).toBeInTheDocument();
  });
});
