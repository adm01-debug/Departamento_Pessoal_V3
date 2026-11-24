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

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div role="menuitem" onClick={onClick}>{children}</div>
  ),
}));

import { QuickActionsMenu } from '../dashboard/QuickActionsMenu';
import { SectionHeader } from '../dashboard/SectionHeader';

describe('QuickActionsMenu', () => {
  it('renders Ações Rápidas label', () => {
    render(<QuickActionsMenu />);
    expect(screen.getAllByText('Ações Rápidas').length).toBeGreaterThan(0);
  });

  it('renders Novo Colaborador action', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText('Novo Colaborador')).toBeInTheDocument();
  });

  it('renders Calcular Folha action', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText('Calcular Folha')).toBeInTheDocument();
  });

  it('renders Férias / Ausências action', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText(/Férias/)).toBeInTheDocument();
  });

  it('renders Relatórios DP action', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText('Relatórios DP')).toBeInTheDocument();
  });

  it('keeps the quick access destinations (Workflows, Auditoria)', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText('Workflows')).toBeInTheDocument();
    expect(screen.getByText('Auditoria')).toBeInTheDocument();
  });

  it('navigates when action clicked', async () => {
    const user = userEvent.setup();
    render(<QuickActionsMenu />);
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
