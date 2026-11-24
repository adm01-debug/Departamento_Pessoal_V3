import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(),
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('framer-motion', () => ({
  motion: { nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav> },
}));

vi.mock('@/lib/utils', () => ({ cn: (...c: string[]) => c.filter(Boolean).join(' ') }));

vi.mock('lucide-react', () => ({
  ChevronRight: () => <span>&gt;</span>,
  Home: () => <span>Home</span>,
}));

import { Breadcrumbs } from '../layout/Breadcrumbs';
import { useLocation } from 'react-router-dom';

const mockLocation = (pathname: string) => {
  vi.mocked(useLocation).mockReturnValue({ pathname } as any);
};

describe('Breadcrumbs', () => {
  it('returns null when path has only one segment', () => {
    mockLocation('/dashboard');
    const { container } = render(<Breadcrumbs />);
    expect(container.firstChild).toBeNull();
  });

  it('renders breadcrumb for two-segment path', () => {
    mockLocation('/colaboradores/col-1');
    render(<Breadcrumbs />);
    expect(screen.getByText('Colaboradores')).toBeTruthy();
    expect(screen.getByText('Detalhes')).toBeTruthy();
  });

  it('shows "Detalhes" for UUID segments', () => {
    mockLocation('/colaboradores/a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    render(<Breadcrumbs />);
    expect(screen.getByText('Detalhes')).toBeTruthy();
  });

  it('shows "Detalhes" for numeric ID segments', () => {
    mockLocation('/colaboradores/12345');
    render(<Breadcrumbs />);
    expect(screen.getByText('Detalhes')).toBeTruthy();
  });

  it('uses routeLabels for known segments', () => {
    mockLocation('/ferias/aquisitivos');
    render(<Breadcrumbs />);
    expect(screen.getByText('Férias')).toBeTruthy();
  });

  it('capitalizes unknown segment labels', () => {
    mockLocation('/unknown-section/detail');
    render(<Breadcrumbs />);
    expect(screen.getByText('Unknown section')).toBeTruthy();
  });

  it('renders a Home link to /dashboard', () => {
    mockLocation('/colaboradores/novo');
    render(<Breadcrumbs />);
    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink.getAttribute('href')).toBe('/dashboard');
  });

  it('last crumb is not a link', () => {
    mockLocation('/colaboradores/novo');
    render(<Breadcrumbs />);
    // "Novo" is the last segment and should be a span, not a link
    const novo = screen.getByText('Novo');
    expect(novo.tagName.toLowerCase()).toBe('span');
  });

  it('renders nav with aria-label Breadcrumb', () => {
    mockLocation('/ferias/aquisitivos');
    render(<Breadcrumbs />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy();
  });
});
