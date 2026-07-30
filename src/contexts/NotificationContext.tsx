// NotificationContext - connected to database via useNotificacoes + toast helpers
import { createContext, useContext, useCallback, ReactNode } from 'react';
import { useNotificacoes, Notificacao } from '@/hooks/useNotificacoes';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: Notificacao[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { notificacoes, naoLidas, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();

  const success = useCallback((title: string, message?: string) => toast.success(message ? `${title}: ${message}` : title), []);
  const error = useCallback((title: string, message?: string) => toast.error(message ? `${title}: ${message}` : title), []);
  const warning = useCallback((title: string, message?: string) => toast.warning(message ? `${title}: ${message}` : title), []);
  const info = useCallback((title: string, message?: string) => toast.info(message ? `${title}: ${message}` : title), []);

  return (
    <NotificationContext.Provider value={{
      notifications: notificacoes,
      unreadCount: naoLidas,
      markAsRead: marcarComoLida,
      markAllAsRead: marcarTodasComoLidas,
      success,
      error,
      warning,
      info}}>
      {children}
    </NotificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = useNotification;
