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

  it('renders Exportar button', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('Exportar')).toBeInTheDocument();
  });

  it('renders Configurações button', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Configurações/i })).toBeInTheDocument();
  });

  it('renders search input with placeholder', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByPlaceholderText(/Pesquisar colaboradores/i)).toBeInTheDocument();
  });

  it('renders month filter button', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('05/2026')).toBeInTheDocument();
  });

  it('renders Todos os Departamentos filter', () => {
    render(<DashboardHeader greeting="Olá" isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText('Todos os Departamentos')).toBeInTheDocument();
  });
});
