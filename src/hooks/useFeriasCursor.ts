/**
 * Hook para paginação com cursor (keyset pagination)
 * Substitui paginação offset-based (page * limit) por cursor-based
 * P1-020: resolve degradação de performance em tabelas >100K registros
 *
 * Uso:
 * const { data, loadMore, hasMore, isLoadingMore } = useFeriasCursor();
 *
 * Para carregar mais: await loadMore() // pega próximo page
 * Para reset: setCursor(null)
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { feriasService } from '@/services';
import { useEmpresas } from './useEmpresas';
import { encodeCursor, extractNextCursor, type FeriasRow } from '@/types/pagination';

interface UseCursorPaginationOptions {
  limit?: number;
  search?: string;
  status?: string;
}

interface UseCursorPaginationResult {
  data: FeriasRow[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => Promise<void>;
  reset: () => void;
  cursors: string[];
}

export function useFeriasCursor(options: UseCursorPaginationOptions = {}): UseCursorPaginationResult {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const limit = options.limit ?? 20;
  const [cursor, setCursor] = useState<string | null>(null);
  const [allData, setAllData] = useState<FeriasRow[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursors, setCursors] = useState<string[]>([]);

  const query = useQuery({
    queryKey: ['ferias-cursor', empresaId, cursor, options],
    queryFn: async () => {
      const result = await feriasService.listSolicitacoes(empresaId!, {
        limit,
        cursor: cursor ?? undefined,
        search: options.search,
        status: options.status,
      });
      return result;
    },
    enabled: !!empresaId,
    staleTime: 30_000, // 30 segundos
  });

  // Atualiza allData quando novos dados chegam
  const newData = (query.data?.data ?? []) as unknown as FeriasRow[];

  // Combina dados existentes com novos (para scroll infinito)
  const combinedData = cursor === null ? newData : [...allData, ...newData];

  // Calcula próximo cursor
  const nextCursor = extractNextCursor(newData, 'id');
  const hasMore = newData.length === limit && nextCursor !== null;

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setCursor(nextCursor);
    setCursors(prev => [...prev, nextCursor]);

    // Fetch mais dados
    const result = await feriasService.listSolicitacoes(empresaId!, {
      limit,
      cursor: nextCursor,
      search: options.search,
      status: options.status,
    });

    // Adiciona aos dados existentes
    setAllData(prev => [...prev, ...((result.data ?? []) as unknown as FeriasRow[])]);
    setIsLoadingMore(false);
  }, [nextCursor, isLoadingMore, empresaId, limit, options]);

  const reset = useCallback(() => {
    setCursor(null);
    setAllData([]);
    setCursors([]);
  }, []);

  return {
    data: combinedData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    hasMore,
    isLoadingMore,
    loadMore,
    reset,
    cursors,
  };
}
