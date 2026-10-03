import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <tr {...props}>{children}</tr>,
  },
}));

vi.mock('@/contexts', () => ({
  useAuth: vi.fn(() => ({ isAdmin: true, hasRole: vi.fn(() => false) })),
}));

vi.mock('@/components/ferias/FeriasWorkflowStepper', () => ({
  FeriasWorkflowStepper: () => <div data-testid="workflow-stepper" />,
}));

vi.mock('@/components/ferias/FeriasActions', () => ({
  FeriasActions: () => <div data-testid="ferias-actions" />,
}));

vi.mock('@/components/ferias/FeriasAuditTimeline', () => ({
  FeriasAuditTimeline: () => <div data-testid="audit-timeline" />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => children,
}));

import { FeriasTable } from '../ferias/FeriasTable';
import type { Ferias } from '@/types/entities';

const MOCK_DATA: Ferias[] = [
  {
    id: 'fer-001',
    colaborador_id: 'c1',
    empresa_id: 'e1',
    data_inicio: '2026-12-01',
    data_fim: '2026-12-30',
    dias_gozo: 30,
    dias_ferias: 30,
    status: 'aprovada',
    cancelado: false,
    abono_pecuniario: false,
    adiantamento_13: false,
    colaborador: {
      nome_completo: 'João Silva',
      foto_url: null,
      cargo: 'Analista',
    },
  },
];

const DEFAULT_PROPS = {
  data: MOCK_DATA,
  onAprovarGestor: vi.fn(),
  onAprovarRH: vi.fn(),
  onEnviarContabilidade: vi.fn(),
  onRejeitar: vi.fn(),
  onCancelar: vi.fn(),
};

describe('FeriasTable', () => {
  it('renders Colaborador header', () => {
    render(<FeriasTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders Período header', () => {
    render(<FeriasTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('Período')).toBeInTheDocument();
  });

  it('renders Dias header', () => {
    render(<FeriasTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('Dias')).toBeInTheDocument();
  });

  it('renders Status header', () => {
    render(<FeriasTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders colaborador name in row', () => {
    render(<FeriasTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders dias_gozo value', () => {
    render(<FeriasTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders Ver Trilha button for admin', () => {
    render(<FeriasTable {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Ver Trilha/i })).toBeInTheDocument();
  });

  it('renders Auditoria header', () => {
    render(<FeriasTable {...DEFAULT_PROPS} />);
    expect(screen.getByText('Auditoria')).toBeInTheDocument();
  });
});
