import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

import { UserProfileMenu } from '../user-profile-menu';

describe('UserProfileMenu — item Ajuda', () => {
  it('aponta para o e-mail de suporte', () => {
    render(
      <MemoryRouter>
        <UserProfileMenu user={{ name: 'Ana Souza', email: 'ana@exemplo.com' }} />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /Ajuda/i });
    expect(link.getAttribute('href')).toMatch(/^mailto:suporte@promobrindes\.com\.br\?subject=/);
    expect(screen.getByText('Falar com o suporte')).toBeInTheDocument();
    expect(screen.queryByText(/documentacção/)).not.toBeInTheDocument();
  });
});
