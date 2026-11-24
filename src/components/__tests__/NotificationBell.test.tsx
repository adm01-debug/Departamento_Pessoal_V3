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
import type { Notificacao, useNotificacoes as useNotificacoesType } from '@/hooks/useNotificacoes';

type NotificacoesHook = ReturnType<typeof useNotificacoesType>;

/** Constrói uma notificação completa a partir de campos parciais. */
function notif(partial: Partial<Notificacao> & { id: string }): Notificacao {
  return {
    user_id: 'u1',
    tipo: 'generico',
    titulo: 'Titulo',
    mensagem: 'Mensagem',
    entidade_tipo: null,
    entidade_id: null,
    lida: false,
    data_referencia: null,
    created_at: new Date().toISOString(),
    ...partial,
  };
}

/** Retorno completo do hook, para satisfazer o contrato em mockReturnValueOnce. */
function hookValue(partial: Partial<NotificacoesHook>): NotificacoesHook {
  return {
    notificacoes: [],
    isLoading: false,
    naoLidas: 0,
    porTipo: { ferias_vencendo: 0, contrato_vencendo: 0, documento_vencendo: 0, periodo_aquisitivo: 0 },
    marcarComoLida: vi.fn(),
    marcarTodasComoLidas: vi.fn(),
    ...partial,
  } as NotificacoesHook;
}

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
    vi.mocked(useNotificacoes).mockReturnValueOnce(hookValue({
      notificacoes: [],
      naoLidas: 3,
      marcarComoLida: vi.fn(),
      marcarTodasComoLidas: vi.fn(),
    }));
    render(<NotificationBell />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders notification item when notificacoes provided', async () => {
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    vi.mocked(useNotificacoes).mockReturnValueOnce(hookValue({
      notificacoes: [notif({ id: 'n1', titulo: 'Teste de notificação', mensagem: 'Mensagem', lida: false, created_at: new Date().toISOString() })],
      naoLidas: 1,
      marcarComoLida: vi.fn(),
      marcarTodasComoLidas: vi.fn(),
    }));
    render(<NotificationBell />);
    expect(screen.getByText('Teste de notificação')).toBeInTheDocument();
  });

  it('renders Ver todas button when notifications exist', async () => {
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    vi.mocked(useNotificacoes).mockReturnValueOnce(hookValue({
      notificacoes: [notif({ id: 'n1', titulo: 'Teste', mensagem: 'Mensagem', lida: true, created_at: new Date().toISOString() })],
      naoLidas: 0,
      marcarComoLida: vi.fn(),
      marcarTodasComoLidas: vi.fn(),
    }));
    render(<NotificationBell />);
    expect(screen.getByText('Ver todas as notificações')).toBeInTheDocument();
  });

  it('renders Marcar lidas button when naoLidas > 0', async () => {
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    vi.mocked(useNotificacoes).mockReturnValueOnce(hookValue({
      notificacoes: [notif({ id: 'n1', titulo: 'Alerta', mensagem: 'Mensagem', lida: false, created_at: new Date().toISOString() })],
      naoLidas: 1,
      marcarComoLida: vi.fn(),
      marcarTodasComoLidas: vi.fn(),
    }));
    render(<NotificationBell />);
    expect(screen.getByRole('button', { name: /Marcar lidas/i })).toBeInTheDocument();
  });
});
