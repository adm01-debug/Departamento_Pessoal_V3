import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationItem } from '../notifications/NotificationItem';

const NOTIFICATIONS = [
  { id: '1', title: 'Férias aprovadas para Carlos', read: false },
  { id: '2', title: 'Novo colaborador admitido', read: true },
];

describe('NotificationItem', () => {
  it('renders Notificações header', () => {
    render(<NotificationItem />);
    expect(screen.getByText('Notificações')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    render(<NotificationItem />);
    expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument();
  });

  it('renders notification titles', () => {
    render(<NotificationItem notifications={NOTIFICATIONS} />);
    expect(screen.getByText('Férias aprovadas para Carlos')).toBeInTheDocument();
    expect(screen.getByText('Novo colaborador admitido')).toBeInTheDocument();
  });

  it('calls onMarkRead with notification id when clicked', async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    render(<NotificationItem notifications={NOTIFICATIONS} onMarkRead={onMarkRead} />);
    await user.click(screen.getByText('Férias aprovadas para Carlos'));
    expect(onMarkRead).toHaveBeenCalledWith('1');
  });

  it('renders all notifications', () => {
    render(<NotificationItem notifications={NOTIFICATIONS} />);
    expect(screen.getAllByRole('listitem').length).toBe(2);
  });
});
