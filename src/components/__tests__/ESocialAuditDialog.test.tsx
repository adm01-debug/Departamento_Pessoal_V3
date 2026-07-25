import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div role="progressbar" aria-valuenow={value} />,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import { ESocialAuditDialog } from '../esocial/ESocialAuditDialog';

const MOCK_EVENTOS = [
  { id: 'e1', tipo_evento: 'S-1200', status: 'enviado', dados: { cpfTrab: '123' } },
  { id: 'e2', tipo_evento: 'S-2200', status: 'pendente', dados: {} },
];

describe('ESocialAuditDialog', () => {
  it('renders dialog title when open', () => {
    render(<ESocialAuditDialog open={true} onOpenChange={vi.fn()} eventos={MOCK_EVENTOS} />);
    expect(screen.getByText('Auditoria Proativa IA')).toBeInTheDocument();
  });

  it('renders conformidade description', () => {
    render(<ESocialAuditDialog open={true} onOpenChange={vi.fn()} eventos={MOCK_EVENTOS} />);
    expect(screen.getByText(/Verificação profunda de conformidade eSocial/i)).toBeInTheDocument();
  });

  it('renders Iniciar Varredura Completa button in initial state', () => {
    render(<ESocialAuditDialog open={true} onOpenChange={vi.fn()} eventos={MOCK_EVENTOS} />);
    expect(screen.getByText(/Iniciar Varredura Completa/i)).toBeInTheDocument();
  });

  it('renders IA analysis description text', () => {
    render(<ESocialAuditDialog open={true} onOpenChange={vi.fn()} eventos={MOCK_EVENTOS} />);
    expect(screen.getByText(/Nossa IA analisará/i)).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(<ESocialAuditDialog open={false} onOpenChange={vi.fn()} eventos={MOCK_EVENTOS} />);
    expect(screen.queryByText('Auditoria Proativa IA')).not.toBeInTheDocument();
  });

  it('renders with empty eventos array without error', () => {
    expect(() =>
      render(<ESocialAuditDialog open={true} onOpenChange={vi.fn()} eventos={[]} />)
    ).not.toThrow();
  });

  it('shows Iniciar Varredura button when eventos have errors', () => {
    const eventos = [{ id: 'e1', tipo_evento: 'S-2200', status: 'erro', dados: {} }];
    render(<ESocialAuditDialog open={true} onOpenChange={vi.fn()} eventos={eventos} />);
    expect(screen.getByText(/Iniciar Varredura Completa/i)).toBeInTheDocument();
  });
});
