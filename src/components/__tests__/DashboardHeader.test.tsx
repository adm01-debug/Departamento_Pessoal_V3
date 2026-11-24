import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children }: any) => <div role="menuitem">{children}</div>,
}));

import { DashboardHeader } from '../dashboard/DashboardHeader';

describe('DashboardHeader', () => {
  it('renders greeting', () => {
    render(<DashboardHeader greeting="Bom dia" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('Bom dia!')).toBeInTheDocument();
  });

  it('highlights the user name when provided', () => {
    render(<DashboardHeader greeting="Bom dia" userName="Abner" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('Abner!')).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('Gestão centralizada e analítica do seu capital humano')).toBeInTheDocument();
  });

  it('renders Sincronizar button', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('Sincronizar')).toBeInTheDocument();
  });

  it('renders Exportar button', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('Exportar')).toBeInTheDocument();
  });

  it('renders Configurações button', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Configurações/i })).toBeInTheDocument();
  });

  it('renders the current date and weekday', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    expect(screen.getByText(new RegExp(`^${dia} de `))).toBeInTheDocument();
  });

  it('renders the actions slot when provided', () => {
    render(
      <DashboardHeader
        greeting="Olá"
        isLoading={false}
        onRefresh={vi.fn()}
        actionsSlot={<button>Ações Rápidas</button>}
      />,
    );
    expect(screen.getByText('Ações Rápidas')).toBeInTheDocument();
  });

  it('disables Sincronizar while loading', () => {
    render(<DashboardHeader greeting="Olá" isLoading onRefresh={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Sincronizar/i })).toBeDisabled();
  });
});
