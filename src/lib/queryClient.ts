import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export function invalidateQueries(key: string | string[]) {
  queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
}

export function prefetchQuery<T>(key: string | string[], queryFn: () => Promise<T>) {
  queryClient.prefetchQuery({ queryKey: Array.isArray(key) ? key : [key], queryFn });
}

export function setQueryData<T>(key: string | string[], data: T) {
  queryClient.setQueryData(Array.isArray(key) ? key : [key], data);
}

export function getQueryData<T>(key: string | string[]): T | undefined {
  return queryClient.getQueryData(Array.isArray(key) ? key : [key]);
}
