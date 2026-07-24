import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationItem } from '../notifications/NotificationItem';
import { NotificationList } from '../notifications/NotificationList';

const SAMPLE = [
  { id: '1', title: 'Aviso de férias', read: false },
  { id: '2', title: 'Folha processada', read: true },
];

describe('NotificationItem', () => {
  it('renders Notificações header', () => {
    render(<NotificationItem />);
    expect(screen.getByText('Notificações')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    render(<NotificationItem notifications={[]} />);
    expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument();
  });

  it('renders notification titles', () => {
    render(<NotificationItem notifications={SAMPLE} />);
    expect(screen.getByText('Aviso de férias')).toBeInTheDocument();
    expect(screen.getByText('Folha processada')).toBeInTheDocument();
  });

  it('calls onMarkRead when item clicked', async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    render(<NotificationItem notifications={SAMPLE} onMarkRead={onMarkRead} />);
    await user.click(screen.getByText('Aviso de férias'));
    expect(onMarkRead).toHaveBeenCalledWith('1');
  });
});

describe('NotificationList', () => {
  it('renders Notificações header', () => {
    render(<NotificationList />);
    expect(screen.getByText('Notificações')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    render(<NotificationList notifications={[]} />);
    expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument();
  });

  it('renders notification titles', () => {
    render(<NotificationList notifications={SAMPLE} />);
    expect(screen.getByText('Aviso de férias')).toBeInTheDocument();
    expect(screen.getByText('Folha processada')).toBeInTheDocument();
  });

  it('calls onMarkRead when item clicked', async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    render(<NotificationList notifications={SAMPLE} onMarkRead={onMarkRead} />);
    await user.click(screen.getByText('Folha processada'));
    expect(onMarkRead).toHaveBeenCalledWith('2');
  });
});
