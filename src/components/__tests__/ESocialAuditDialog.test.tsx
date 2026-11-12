import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: { children?: ReactNode }) => <div>{children}</div> },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value?: number }) => <div role="progressbar" aria-valuenow={value} />,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { ESocialAuditDialog } from '../esocial/ESocialAuditDialog';
import type { ESocialEvento } from '@/services/esocialService';

/** Preenche os campos obrigatórios do contrato ESocialEvento nos mocks de teste. */
function evento(partial: Partial<ESocialEvento> & { id: string }): ESocialEvento {
  return {
    empresa_id: 'emp-1',
    tipo_evento: 'S-1200',
    dados: null,
    competencia: '2024-07',
    status: 'pendente',
    data_envio: null,
    protocolo: null,
    erros: null,
    xml: null,
    created_at: '2024-07-01T10:00:00',
    updated_at: '2024-07-01T10:00:00',
    ...partial,
  };
}

const MOCK_EVENTOS = [
  evento({ id: 'e1', tipo_evento: 'S-1200', status: 'enviado', dados: { cpfTrab: '123' } }),
  evento({ id: 'e2', tipo_evento: 'S-2200', status: 'pendente', dados: {} }),
];

describe('ESocialAuditDialog', () => {
  it('renders honest dialog title when open (sem alegar IA)', () => {
    render(<ESocialAuditDialog open={true} onOpenChange={vi.fn()} eventos={MOCK_EVENTOS} />);
    expect(screen.getByText('Checagem de consistência')).toBeInTheDocument();
    expect(screen.queryByText(/\bIA\b/)).not.toBeInTheDocument();
  });

  it('renders description with the number of eventos checked', () => {
    render(<ESocialAuditDialog open={true} onOpenChange={vi.fn()} eventos={MOCK_EVENTOS} />);
    expect(screen.getByText(/Regras básicas aplicadas aos 2 eventos carregados/i)).toBeInTheDocument();
  });

  it('shows results immediately, without fake progress bar', () => {
    render(<ESocialAuditDialog open={true} onOpenChange={vi.fn()} eventos={MOCK_EVENTOS} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/Iniciar Varredura/i)).not.toBeInTheDocument();
    expect(screen.getByText('Score de Conformidade')).toBeInTheDocument();
    // 1 pendente => 100 - 2 = 98
    expect(screen.getByText('98%')).toBeInTheDocument();
  });

  it('flags S-1200 without matching S-1210', () => {
    render(<ESocialAuditDialog open={true} onOpenChange={vi.fn()} eventos={MOCK_EVENTOS} />);
    expect(screen.getByText(/1 remunerações \(S-1200\) sem o respectivo pagamento \(S-1210\)/)).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(<ESocialAuditDialog open={false} onOpenChange={vi.fn()} eventos={MOCK_EVENTOS} />);
    expect(screen.queryByText('Checagem de consistência')).not.toBeInTheDocument();
  });

  it('renders conformity message with empty eventos array', () => {
    render(<ESocialAuditDialog open={true} onOpenChange={vi.fn()} eventos={[]} />);
    expect(screen.getByText(/Todos os eventos analisados estão em conformidade/i)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows critical alert when eventos have errors', () => {
    const eventos = [evento({ id: 'e1', tipo_evento: 'S-2200', status: 'erro', dados: {} })];
    render(<ESocialAuditDialog open={true} onOpenChange={vi.fn()} eventos={eventos} />);
    expect(screen.getByText(/1 eventos estão com erro e bloqueiam o fechamento da folha/i)).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('closes the dialog from the acknowledge button', () => {
    const onOpenChange = vi.fn();
    render(<ESocialAuditDialog open={true} onOpenChange={onOpenChange} eventos={MOCK_EVENTOS} />);
    fireEvent.click(screen.getByText(/Entendido, vou ajustar/i));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
