import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

/**
 * Wrapper padrão de QueryClient para testes de hooks.
 * Retry desligado em queries e mutações para falhas propagarem na hora.
 */
export function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

/**
 * Wrapper + espião de invalidação: permite assertar qual queryKey a mutação
 * invalidou sem mockar o módulo @tanstack/react-query inteiro.
 */
export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const queryWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper: queryWrapper, invalidateSpy };
}
