import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useNotificacoes', () => ({
  useNotificacoes: vi.fn(() => ({
    notificacoes: [],
    naoLidas: 0,
    marcarComoLida: vi.fn(),
    marcarTodasComoLidas: vi.fn(),
  })),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => children,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

import { NotificationBell } from '../notifications/NotificationBell';

describe('NotificationBell', () => {
  it('renders bell button with Notificações aria-label', () => {
    render(<NotificationBell />);
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeInTheDocument();
  });

  it('renders Notificações heading in popover', () => {
    render(<NotificationBell />);
    expect(screen.getByText('Notificações')).toBeInTheDocument();
  });

  it('renders empty state message', () => {
    render(<NotificationBell />);
    expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument();
  });

  it('does not render unread badge when naoLidas is 0', () => {
    render(<NotificationBell />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders unread badge when naoLidas > 0', async () => {
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    vi.mocked(useNotificacoes).mockReturnValueOnce({
      notificacoes: [],
      naoLidas: 3,
      marcarComoLida: vi.fn(),
      marcarTodasComoLidas: vi.fn(),
    });
    render(<NotificationBell />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders notification item when notificacoes provided', async () => {
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    vi.mocked(useNotificacoes).mockReturnValueOnce({
      notificacoes: [{ id: 'n1', titulo: 'Teste de notificação', mensagem: 'Mensagem', lida: false, created_at: new Date().toISOString() }],
      naoLidas: 1,
      marcarComoLida: vi.fn(),
      marcarTodasComoLidas: vi.fn(),
    });
    render(<NotificationBell />);
    expect(screen.getByText('Teste de notificação')).toBeInTheDocument();
  });

  it('renders Ver todas button when notifications exist', async () => {
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    vi.mocked(useNotificacoes).mockReturnValueOnce({
      notificacoes: [{ id: 'n1', titulo: 'Teste', mensagem: null, lida: true, created_at: new Date().toISOString() }],
      naoLidas: 0,
      marcarComoLida: vi.fn(),
      marcarTodasComoLidas: vi.fn(),
    });
    render(<NotificationBell />);
    expect(screen.getByText('Ver todas as notificações')).toBeInTheDocument();
  });

  it('renders Marcar lidas button when naoLidas > 0', async () => {
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    vi.mocked(useNotificacoes).mockReturnValueOnce({
      notificacoes: [{ id: 'n1', titulo: 'Alerta', mensagem: null, lida: false, created_at: new Date().toISOString() }],
      naoLidas: 1,
      marcarComoLida: vi.fn(),
      marcarTodasComoLidas: vi.fn(),
    });
    render(<NotificationBell />);
    expect(screen.getByRole('button', { name: /Marcar lidas/i })).toBeInTheDocument();
  });
});
