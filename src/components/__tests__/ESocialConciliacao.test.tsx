import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ESocialConciliacao } from '../esocial/ESocialConciliacao';

describe('ESocialConciliacao', () => {
  it('renders Conciliação de Valores title', () => {
    render(<ESocialConciliacao />);
    expect(screen.getByText('Conciliação de Valores')).toBeInTheDocument();
  });

  it('renders Total Sistema card', () => {
    render(<ESocialConciliacao />);
    expect(screen.getByText('Total Sistema')).toBeInTheDocument();
  });

  it('renders Total Governo card', () => {
    render(<ESocialConciliacao />);
    expect(screen.getByText(/Total Governo/)).toBeInTheDocument();
  });

  it('renders Divergência Total card', () => {
    render(<ESocialConciliacao />);
    expect(screen.getByText('Divergência Total')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<ESocialConciliacao />);
    expect(screen.getByText('Rubrica / Verba')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders rubrica rows', () => {
    render(<ESocialConciliacao />);
    expect(screen.getByText(/Salário Base/)).toBeInTheDocument();
    expect(screen.getByText(/INSS Segurado/)).toBeInTheDocument();
  });

  it('renders Recalcular and Relatório PDF buttons', () => {
    render(<ESocialConciliacao />);
    expect(screen.getByText('Recalcular')).toBeInTheDocument();
    expect(screen.getByText('Relatório PDF')).toBeInTheDocument();
  });

  it('Recalcular button can be clicked', async () => {
    const user = userEvent.setup();
    render(<ESocialConciliacao />);
    const btn = screen.getByText('Recalcular');
    await user.click(btn);
    expect(btn.closest('button')).toBeDisabled();
  });
});
