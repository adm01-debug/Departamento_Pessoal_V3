import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({
  toast: { success: () => {}, error: () => {} },
}));

vi.mock('@/utils/format', () => ({
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
}));

vi.mock('@/components/ui/status-badge', () => ({
  StatusBadge: ({ status }: { status?: string }) => <span>{status}</span>,
}));

vi.mock('@/components/esocial/ESocialEventViewer', () => ({
  ESocialEventViewer: () => <div>EventViewer</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  RadioGroupItem: () => <input type="radio" />,
}));

import { ESocialLogsTab, ESocialConfigTab } from '../esocial/tabs';

const LOGS = [
  {
    id: '1',
    created_at: '2024-07-01T10:00:00',
    tipo_evento: 'S-2200',
    status: 'sucesso',
    duracao_ms: 120,
    payload_resposta: null,
  },
];

const CERTIFICADOS = [
  {
    id: 'cert1',
    subject: 'Empresa LTDA',
    valid_to: '2025-12-31',
    ativo: true,
  },
];

describe('ESocialLogsTab', () => {
  it('renders Histórico de Transmissão Real title', () => {
    render(<ESocialLogsTab logs={[]} eventos={[]} refreshLogs={vi.fn()} />);
    expect(screen.getByText('Histórico de Transmissão Real')).toBeInTheDocument();
  });

  it('shows empty state when no logs', () => {
    render(<ESocialLogsTab logs={[]} eventos={[]} refreshLogs={vi.fn()} />);
    expect(screen.getByText('Nenhum log de transmissão encontrado.')).toBeInTheDocument();
  });

  it('shows log headers when logs exist', () => {
    render(<ESocialLogsTab logs={LOGS} eventos={[]} refreshLogs={vi.fn()} />);
    expect(screen.getByText('Data/Hora')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('calls refreshLogs when Atualizar clicked', async () => {
    const user = userEvent.setup();
    const refreshLogs = vi.fn();
    render(<ESocialLogsTab logs={[]} eventos={[]} refreshLogs={refreshLogs} />);
    await user.click(screen.getByText('Atualizar'));
    expect(refreshLogs).toHaveBeenCalled();
  });
});

describe('ESocialConfigTab', () => {
  const defaultProps = {
    certificados: [],
    config: null,
    empresaAtual: { id: 'emp1' },
    salvarConfig: vi.fn(),
    adicionarCertificado: vi.fn(),
  };

  it('renders Certificado Digital title', () => {
    render(<ESocialConfigTab {...defaultProps} />);
    expect(screen.getByText('Certificado Digital (A1)')).toBeInTheDocument();
  });

  it('shows empty state when no certificados', () => {
    render(<ESocialConfigTab {...defaultProps} />);
    expect(screen.getByText('Nenhum certificado cadastrado')).toBeInTheDocument();
  });

  it('renders certificado subject when provided', () => {
    render(<ESocialConfigTab {...defaultProps} certificados={CERTIFICADOS} />);
    expect(screen.getByText('Empresa LTDA')).toBeInTheDocument();
  });
});
