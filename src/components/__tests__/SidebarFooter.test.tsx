import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div>{children}</div>,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
  AvatarImage: () => null,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  LogOut: () => <span data-testid="icon-logout" />,
  HelpCircle: () => <span data-testid="icon-help" />,
}));

const mockRestart = vi.fn();

vi.mock('@/components/onboarding/GuidedTour', () => ({
  useGuidedTour: () => ({ restart: mockRestart }),
}));

import { SidebarFooter } from '../layout/SidebarFooter';

const defaultUser = { name: 'João Silva', email: 'joao@empresa.com' };

describe('SidebarFooter — expanded', () => {
  it('renders user initials', () => {
    render(<SidebarFooter collapsed={false} user={defaultUser} userInitials="JS" onSignOut={vi.fn()} />);
    expect(screen.getByText('JS')).toBeTruthy();
  });

  it('renders user name', () => {
    render(<SidebarFooter collapsed={false} user={defaultUser} userInitials="JS" onSignOut={vi.fn()} />);
    expect(screen.getByText('João Silva')).toBeTruthy();
  });

  it('renders user email', () => {
    render(<SidebarFooter collapsed={false} user={defaultUser} userInitials="JS" onSignOut={vi.fn()} />);
    expect(screen.getAllByText('joao@empresa.com')).toBeTruthy();
  });

  it('falls back to email when name is not set', () => {
    render(<SidebarFooter collapsed={false} user={{ email: 'x@y.com' }} userInitials="X" onSignOut={vi.fn()} />);
    expect(screen.getAllByText('x@y.com').length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to "Usuário" when user has no name or email', () => {
    render(<SidebarFooter collapsed={false} user={{}} userInitials="?" onSignOut={vi.fn()} />);
    expect(screen.getByText('Usuário')).toBeTruthy();
  });

  it('calls onSignOut when Sair button clicked', () => {
    const onSignOut = vi.fn();
    render(<SidebarFooter collapsed={false} user={defaultUser} userInitials="JS" onSignOut={onSignOut} />);
    fireEvent.click(screen.getByLabelText('Sair do sistema'));
    expect(onSignOut).toHaveBeenCalled();
  });

  it('renders "Tour do Sistema" button', () => {
    render(<SidebarFooter collapsed={false} user={defaultUser} userInitials="JS" onSignOut={vi.fn()} />);
    expect(screen.getByText('Tour do Sistema')).toBeTruthy();
  });

  it('calls restart when Tour do Sistema clicked', () => {
    render(<SidebarFooter collapsed={false} user={defaultUser} userInitials="JS" onSignOut={vi.fn()} />);
    fireEvent.click(screen.getByText('Tour do Sistema'));
    expect(mockRestart).toHaveBeenCalled();
  });

  it('renders Sair label text when expanded', () => {
    render(<SidebarFooter collapsed={false} user={defaultUser} userInitials="JS" onSignOut={vi.fn()} />);
    expect(screen.getByText('Sair')).toBeTruthy();
  });
});

describe('SidebarFooter — collapsed', () => {
  it('does not show name or email in collapsed mode', () => {
    render(<SidebarFooter collapsed={true} user={defaultUser} userInitials="JS" onSignOut={vi.fn()} />);
    expect(screen.queryByText('João Silva')).toBeNull();
    expect(screen.queryByText('Tour do Sistema')).toBeNull();
  });

  it('shows Sair icon button in collapsed mode', () => {
    render(<SidebarFooter collapsed={true} user={defaultUser} userInitials="JS" onSignOut={vi.fn()} />);
    expect(screen.getByLabelText('Sair do sistema')).toBeTruthy();
  });

  it('calls onSignOut from collapsed Sair button', () => {
    const onSignOut = vi.fn();
    render(<SidebarFooter collapsed={true} user={defaultUser} userInitials="JS" onSignOut={onSignOut} />);
    fireEvent.click(screen.getByLabelText('Sair do sistema'));
    expect(onSignOut).toHaveBeenCalled();
  });
});
