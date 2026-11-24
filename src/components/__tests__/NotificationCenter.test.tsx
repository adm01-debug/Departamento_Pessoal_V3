import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { NotificationCenter } from '../notifications/NotificationCenter';

const MOCK_NOTIFICATIONS = [
  { id: 'n1', title: 'Férias aprovadas', read: false },
  { id: 'n2', title: 'Novo holerite disponível', read: true },
];

describe('NotificationCenter', () => {
  it('renders Notificações heading', () => {
    render(<NotificationCenter />);
    expect(screen.getByText('Notificações')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    render(<NotificationCenter />);
    expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument();
  });

  it('does not show empty state when notifications provided', () => {
    render(<NotificationCenter notifications={MOCK_NOTIFICATIONS} />);
    expect(screen.queryByText('Nenhuma notificação')).not.toBeInTheDocument();
  });

  it('renders notification title when provided', () => {
    render(<NotificationCenter notifications={MOCK_NOTIFICATIONS} />);
    expect(screen.getByText('Férias aprovadas')).toBeInTheDocument();
  });

  it('renders second notification title when provided', () => {
    render(<NotificationCenter notifications={MOCK_NOTIFICATIONS} />);
    expect(screen.getByText('Novo holerite disponível')).toBeInTheDocument();
  });

  it('renders list items when notifications provided', () => {
    render(<NotificationCenter notifications={MOCK_NOTIFICATIONS} />);
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(2);
  });

  it('renders Bell icon container', () => {
    const { container } = render(<NotificationCenter />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with empty notifications array explicitly', () => {
    render(<NotificationCenter notifications={[]} />);
    expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument();
  });
});
