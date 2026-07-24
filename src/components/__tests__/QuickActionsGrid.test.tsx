import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, className, ...props }: any) => (
      <button onClick={onClick} className={className} {...props}>{children}</button>
    ),
    create: (Component: any) => ({ children, ...props }: any) => <Component {...props}>{children}</Component>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

import { QuickActionsGrid } from '../dashboard/QuickActionsGrid';

describe('QuickActionsGrid', () => {
  it('renders Ações Rápidas heading', () => {
    render(<QuickActionsGrid />);
    expect(screen.getByText('Ações Rápidas')).toBeInTheDocument();
  });

  it('renders Novo Colaborador action', () => {
    render(<QuickActionsGrid />);
    expect(screen.getByText('Novo Colaborador')).toBeInTheDocument();
  });

  it('renders Lançar Ponto action', () => {
    render(<QuickActionsGrid />);
    expect(screen.getByText('Lançar Ponto')).toBeInTheDocument();
  });

  it('renders Calcular Folha action', () => {
    render(<QuickActionsGrid />);
    expect(screen.getByText('Calcular Folha')).toBeInTheDocument();
  });

  it('renders Férias / Ausências action', () => {
    render(<QuickActionsGrid />);
    expect(screen.getByText('Férias / Ausências')).toBeInTheDocument();
  });

  it('renders Passivo Trabalhista action', () => {
    render(<QuickActionsGrid />);
    expect(screen.getByText('Passivo Trabalhista')).toBeInTheDocument();
  });

  it('renders Relatórios DP action', () => {
    render(<QuickActionsGrid />);
    expect(screen.getByText('Relatórios DP')).toBeInTheDocument();
  });

  it('renders 6 action buttons', () => {
    render(<QuickActionsGrid />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(6);
  });
});
