import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <div {...rest}>{children}</div>,
  },
}));

import { ESocialConciliacao } from '../esocial/ESocialConciliacao';

describe('ESocialConciliacao', () => {
  it('renders Conciliação de Valores title', () => {
    render(<ESocialConciliacao />);
    expect(screen.getByText('Conciliação de Valores')).toBeInTheDocument();
  });

  it('shows the unavailable state while S-5001/S-5002 returns are not imported', () => {
    render(<ESocialConciliacao />);
    expect(screen.getByText('Conciliação indisponível')).toBeInTheDocument();
    expect(screen.getByText(/retornos S-5001\/S-5002/)).toBeInTheDocument();
  });

  it('does not render fabricated totals or rubricas', () => {
    render(<ESocialConciliacao />);
    expect(screen.queryByText('Total Sistema')).not.toBeInTheDocument();
    expect(screen.queryByText('Divergência Total')).not.toBeInTheDocument();
    expect(screen.queryByText(/Salário Base/)).not.toBeInTheDocument();
    expect(screen.queryByText(/INSS Segurado/)).not.toBeInTheDocument();
  });

  it('does not render actions without a backend operation', () => {
    render(<ESocialConciliacao />);
    expect(screen.queryByText('Recalcular')).not.toBeInTheDocument();
    expect(screen.queryByText('Relatório PDF')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
