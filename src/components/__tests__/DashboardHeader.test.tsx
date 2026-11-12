import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children?: ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children }: { children?: ReactNode }) => <div role="menuitem">{children}</div>,
}));

import { DashboardHeader } from '../dashboard/DashboardHeader';

describe('DashboardHeader', () => {
  it('renders greeting with wave emoji', () => {
    render(<DashboardHeader greeting="Bom dia" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('Bom dia!')).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('Gestão centralizada e analítica do seu capital humano')).toBeInTheDocument();
  });

  it('renders Sincronizar button', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('Sincronizar')).toBeInTheDocument();
  });

  it('does not render inert Exportar menu', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.queryByText('Exportar')).not.toBeInTheDocument();
  });

  it('renders Configurações button', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Configurações/i })).toBeInTheDocument();
  });

  it('does not render inert search input', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.queryByPlaceholderText(/Pesquisar colaboradores/i)).not.toBeInTheDocument();
  });

  it('renders current competência instead of a fixed month', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    const now = new Date();
    const atual = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    expect(screen.getByLabelText('Competência exibida')).toHaveTextContent(atual);
    expect(screen.queryByText('05/2026')).toBeNull();
  });

  it('does not render inert department filter', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.queryByText('Todos os Departamentos')).not.toBeInTheDocument();
  });
});
