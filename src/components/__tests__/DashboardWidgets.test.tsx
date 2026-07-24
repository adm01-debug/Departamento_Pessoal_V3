import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Users } from 'lucide-react';

const mockNavigate = vi.fn();

vi.mock('framer-motion', () => ({
  motion: {
    create: (Component: any) => ({ children, ...rest }: any) => <Component {...rest}>{children}</Component>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>,
  },
  useInView: () => true,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

import { QuickActionsGrid } from '../dashboard/QuickActionsGrid';
import { SectionHeader } from '../dashboard/SectionHeader';

describe('QuickActionsGrid', () => {
  it('renders Ações Rápidas title', () => {
    render(<QuickActionsGrid />);
    expect(screen.getByText('Ações Rápidas')).toBeInTheDocument();
  });

  it('renders Novo Colaborador action', () => {
    render(<QuickActionsGrid />);
    expect(screen.getByText('Novo Colaborador')).toBeInTheDocument();
  });

  it('renders Calcular Folha action', () => {
    render(<QuickActionsGrid />);
    expect(screen.getByText('Calcular Folha')).toBeInTheDocument();
  });

  it('renders Férias / Ausências action', () => {
    render(<QuickActionsGrid />);
    expect(screen.getByText(/Férias/)).toBeInTheDocument();
  });

  it('renders Relatórios DP action', () => {
    render(<QuickActionsGrid />);
    expect(screen.getByText('Relatórios DP')).toBeInTheDocument();
  });

  it('navigates when action button clicked', async () => {
    const user = userEvent.setup();
    render(<QuickActionsGrid />);
    await user.click(screen.getByText('Novo Colaborador'));
    expect(mockNavigate).toHaveBeenCalledWith('/colaboradores/novo');
  });
});

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="Colaboradores" icon={Users} />);
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<SectionHeader title="Folha" subtitle="Processamento mensal" icon={Users} />);
    expect(screen.getByText('Processamento mensal')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    render(<SectionHeader title="Cargos" icon={Users} />);
    expect(screen.queryByRole('paragraph')).toBeNull();
  });

  it('renders action slot when provided', () => {
    render(<SectionHeader title="Teste" icon={Users} action={<button>Novo</button>} />);
    expect(screen.getByText('Novo')).toBeInTheDocument();
  });
});
