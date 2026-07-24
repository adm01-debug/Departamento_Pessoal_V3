import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

const { mockToastSuccess, mockToastError, mockToastWarning, mockToastInfo,
  mockMarcarComoLida, mockMarcarTodasComoLidas } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
  mockToastInfo: vi.fn(),
  mockMarcarComoLida: vi.fn(),
  mockMarcarTodasComoLidas: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    warning: mockToastWarning,
    info: mockToastInfo,
  },
}));

vi.mock('@/hooks/useNotificacoes', () => ({
  useNotificacoes: () => ({
    notificacoes: [{ id: 'n1', lida: false, titulo: 'Test' }],
    naoLidas: 1,
    marcarComoLida: mockMarcarComoLida,
    marcarTodasComoLidas: mockMarcarTodasComoLidas,
  }),
}));

import { NotificationProvider, useNotification } from '../NotificationContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(NotificationProvider, null, children);
}

describe('useNotification', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useNotification())).toThrow(
      'useNotification must be used within NotificationProvider'
    );
  });

  it('provides notifications from useNotificacoes', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].id).toBe('n1');
  });

  it('provides unreadCount from naoLidas', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    expect(result.current.unreadCount).toBe(1);
  });

  it('markAsRead delegates to marcarComoLida', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    act(() => { result.current.markAsRead('n1'); });
    expect(mockMarcarComoLida).toHaveBeenCalledWith('n1');
  });

  it('markAllAsRead delegates to marcarTodasComoLidas', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    act(() => { result.current.markAllAsRead(); });
    expect(mockMarcarTodasComoLidas).toHaveBeenCalled();
  });

  it('success calls toast.success with title only', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    act(() => { result.current.success('Saved'); });
    expect(mockToastSuccess).toHaveBeenCalledWith('Saved');
  });

  it('success calls toast.success with title: message when message provided', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    act(() => { result.current.success('Title', 'Detail'); });
    expect(mockToastSuccess).toHaveBeenCalledWith('Title: Detail');
  });

  it('error calls toast.error', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    act(() => { result.current.error('Error title'); });
    expect(mockToastError).toHaveBeenCalledWith('Error title');
  });

  it('warning calls toast.warning', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    act(() => { result.current.warning('Warning'); });
    expect(mockToastWarning).toHaveBeenCalledWith('Warning');
  });

  it('info calls toast.info', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    act(() => { result.current.info('Info msg'); });
    expect(mockToastInfo).toHaveBeenCalledWith('Info msg');
  });
});
