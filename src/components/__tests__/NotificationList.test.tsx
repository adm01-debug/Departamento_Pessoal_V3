import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { NotificationList } from '../notifications/NotificationList';

const MOCK_NOTIFICATIONS = [
  { id: 'n1', title: 'Solicitação de ajuste aprovada', read: false },
  { id: 'n2', title: 'Holerite de junho disponível', read: true },
];

describe('NotificationList', () => {
  it('renders Notificações heading', () => {
    render(<NotificationList />);
    expect(screen.getByText('Notificações')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    render(<NotificationList />);
    expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument();
  });

  it('does not show empty state when notifications provided', () => {
    render(<NotificationList notifications={MOCK_NOTIFICATIONS} />);
    expect(screen.queryByText('Nenhuma notificação')).not.toBeInTheDocument();
  });

  it('renders notification title when provided', () => {
    render(<NotificationList notifications={MOCK_NOTIFICATIONS} />);
    expect(screen.getByText('Solicitação de ajuste aprovada')).toBeInTheDocument();
  });

  it('renders second notification when provided', () => {
    render(<NotificationList notifications={MOCK_NOTIFICATIONS} />);
    expect(screen.getByText('Holerite de junho disponível')).toBeInTheDocument();
  });

  it('calls onMarkRead when notification clicked', () => {
    const onMarkRead = vi.fn();
    render(<NotificationList notifications={MOCK_NOTIFICATIONS} onMarkRead={onMarkRead} />);
    fireEvent.click(screen.getByText('Solicitação de ajuste aprovada'));
    expect(onMarkRead).toHaveBeenCalledWith('n1');
  });

  it('renders list items for each notification', () => {
    render(<NotificationList notifications={MOCK_NOTIFICATIONS} />);
    expect(screen.getAllByRole('listitem').length).toBe(2);
  });

  it('renders Bell icon in the heading area', () => {
    const { container } = render(<NotificationList />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
