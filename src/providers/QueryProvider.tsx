// V15-348
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * QueryProvider — instancia o QueryClient via useState para que o HMR/dev
 * recrie o cliente quando o componente raiz remontar, evitando cache stale
 * persistente entre sessões de desenvolvimento e vazamento entre testes.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            // retry: false — CORS errors (TypeError: Failed to fetch) do NOT benefit de
            // retry, pois o browser bloqueia a resposta com ACAO errado antes do JS
            // enxergar o body. O retry apenas amplifica o loop de erros no console.
            // Queries failed gracefully: React Query propaga o erro ao componente.
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
