import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockLocation = { pathname: '/dashboard' };
vi.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
  Link: ({ children, to, 'aria-label': ariaLabel, 'aria-current': ariaCurrent }: any) => (
    <a href={to} aria-label={ariaLabel} aria-current={ariaCurrent}>{children}</a>
  ),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ isAdmin: true })),
}));

vi.mock('@/lib/utils', () => ({ cn: (...c: any[]) => c.filter(Boolean).join(' ') }));

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, className }: any) => <div className={className}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/layout/MobileQuickActions', () => ({
  MobileQuickActions: ({ open, onOpenChange }: any) => (
    <div data-testid="quick-actions" data-open={String(open)}>
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  ),
}));

vi.mock('lucide-react', () => {
  const s = () => <span />;
  return {
    Home: s, Users: s, FileText: s, Calendar: s, MoreHorizontal: s,
    LayoutGrid: s, Scale: s,
    // icons used transitively by MobileQuickActions
    Zap: s, UserPlus: s, DollarSign: s, Clock: s, BarChart3: s, X: s,
    ChevronRight: s, ClipboardList: s, Calculator: s, Settings: s, Network: s,
  };
});

import { MobileBottomNav } from '../layout/MobileBottomNav';
import { useAuth } from '@/hooks/useAuth';

describe('MobileBottomNav', () => {
  it('renders nav with aria-label', () => {
    render(<MobileBottomNav />);
    expect(screen.getByRole('navigation', { name: 'Navegação mobile' })).toBeTruthy();
  });

  it('renders Home link', () => {
    render(<MobileBottomNav />);
    expect(screen.getByLabelText('Home')).toBeTruthy();
  });

  it('renders Equipe link', () => {
    render(<MobileBottomNav />);
    expect(screen.getByLabelText('Equipe')).toBeTruthy();
  });

  it('renders Folha link', () => {
    render(<MobileBottomNav />);
    expect(screen.getByLabelText('Folha')).toBeTruthy();
  });

  it('renders Ações button (special quick-actions trigger)', () => {
    render(<MobileBottomNav />);
    expect(screen.getByText('Ações')).toBeTruthy();
  });

  it('marks Home as active when pathname is /dashboard', () => {
    render(<MobileBottomNav />);
    const homeLink = screen.getByLabelText('Home');
    expect(homeLink.getAttribute('aria-current')).toBe('page');
  });

  it('shows Mais link when isAdmin=true', () => {
    render(<MobileBottomNav />);
    expect(screen.getByLabelText('Mais')).toBeTruthy();
  });

  it('hides Mais link when isAdmin=false', () => {
    (useAuth as any).mockReturnValueOnce({ isAdmin: false });
    render(<MobileBottomNav />);
    expect(screen.queryByLabelText('Mais')).toBeNull();
  });

  it('opens MobileQuickActions when Ações button clicked', () => {
    render(<MobileBottomNav />);
    const qa = screen.getByTestId('quick-actions');
    expect(qa.getAttribute('data-open')).toBe('false');
    fireEvent.click(screen.getByText('Ações'));
    expect(qa.getAttribute('data-open')).toBe('true');
  });

  it('closes MobileQuickActions when onOpenChange(false) is called', () => {
    render(<MobileBottomNav />);
    fireEvent.click(screen.getByText('Ações'));
    const qa = screen.getByTestId('quick-actions');
    expect(qa.getAttribute('data-open')).toBe('true');
    fireEvent.click(screen.getByText('Close'));
    expect(qa.getAttribute('data-open')).toBe('false');
  });
});
