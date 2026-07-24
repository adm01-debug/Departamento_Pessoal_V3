import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

import { GuidedTour } from '../onboarding/GuidedTour';

describe('GuidedTour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.removeItem('dp-tour-completed');
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('renders nothing before 2s when localStorage empty', () => {
    render(<GuidedTour />);
    expect(screen.queryByText(/Passo/i)).toBeNull();
  });

  it('renders tour card after 2s on first visit', () => {
    render(<GuidedTour />);
    act(() => { vi.advanceTimersByTime(2001); });
    expect(screen.getByText(/Passo 1 de 6/i)).toBeInTheDocument();
  });

  it('shows first step title Sidebar de Navegação', () => {
    render(<GuidedTour />);
    act(() => { vi.advanceTimersByTime(2001); });
    expect(screen.getByText('Sidebar de Navegação')).toBeInTheDocument();
  });

  it('shows Próximo button', () => {
    render(<GuidedTour />);
    act(() => { vi.advanceTimersByTime(2001); });
    expect(screen.getByRole('button', { name: /Próximo/i })).toBeInTheDocument();
  });

  it('shows Fechar button', () => {
    render(<GuidedTour />);
    act(() => { vi.advanceTimersByTime(2001); });
    expect(screen.getByRole('button', { name: /Fechar/i })).toBeInTheDocument();
  });

  it('shows first step description text', () => {
    render(<GuidedTour />);
    act(() => { vi.advanceTimersByTime(2001); });
    expect(screen.getByText(/Acesse todos os módulos do sistema/i)).toBeInTheDocument();
  });

  it('Anterior button is disabled on step 1', () => {
    render(<GuidedTour />);
    act(() => { vi.advanceTimersByTime(2001); });
    const anteriorBtn = screen.getByRole('button', { name: /Anterior/i });
    expect(anteriorBtn).toBeDisabled();
  });

  it('renders nothing when tour already completed', () => {
    localStorage.setItem('dp-tour-completed', 'true');
    render(<GuidedTour />);
    act(() => { vi.advanceTimersByTime(2001); });
    expect(screen.queryByText(/Passo/i)).toBeNull();
  });
});
