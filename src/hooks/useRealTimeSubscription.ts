import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { loggerService } from '@/services/loggerService';

export function useRealTimeSubscription(
  table: string,
  queryKey: QueryKey,
  empresaId?: string,
  options: { event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'; schema?: string } = { event: '*', schema: 'public' }
) {
  const queryClient = useQueryClient();
  // queryKey costuma ser um array literal recriado a cada render; estabilizamos por valor
  // para evitar recriar handleChange/efeito (e re-subscrever o canal) em todo render.
  const queryKeyString = JSON.stringify(queryKey);

  const handleChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    if (import.meta.env.DEV) {
      console.debug(`[RealTime] Change detected in ${table}:`, payload.eventType);
    }
    loggerService.info(`Realtime change detected in ${table}`, {
      table,
      eventType: payload.eventType,
      schema: payload.schema
    });
    void queryClient.invalidateQueries({ queryKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, queryClient, queryKeyString]);

  useEffect(() => {
    if (!empresaId) return;

    // UUID único evita colisão quando o mesmo hook é montado por múltiplos componentes
    const channelName = `rt-${table}-${empresaId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: options.event || '*',
          schema: options.schema || 'public',
          table: table,
          filter: `empresa_id=eq.${empresaId}`,
        } as any,
        handleChange
      );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        loggerService.info(`Subscribed to realtime channel: ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        loggerService.error(`Failed to subscribe to realtime channel: ${channelName}`);
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
     
  }, [table, queryKeyString, empresaId, options.event, options.schema, handleChange]);
}
