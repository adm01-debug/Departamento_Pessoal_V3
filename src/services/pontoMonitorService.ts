import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loggerService } from './loggerService';

export const pontoMonitorService = {
  logEvent: async (eventName: string, details: any) => {
    try {
      // Usando a tabela de auditoria para monitoramento técnico também
      const { error } = await (supabase as any).from('ponto_auditoria').insert({
        tabela_nome: 'SYSTEM_EVENT',
        registro_id: '00000000-0000-0000-0000-000000000000',
        acao: eventName,
        dados_novos: details,
        usuario_id: (await supabase.auth.getUser()).data.user?.id,
        user_agent: navigator.userAgent
      });
      if (error) throw error;
    } catch (err: unknown) {
      loggerService.error('Falha ao registrar log de monitoramento', { eventName }, err instanceof Error ? err : new Error(String(err)));
    }
  },

  trackGeofenceFailure: (colaboradorId: string, lat: number, lng: number, expectedRadius: number) => {
    return pontoMonitorService.logEvent('GEOFENCE_FAILURE', {
      colaboradorId,
      coords: { lat, lng },
      radius: expectedRadius,
      timestamp: new Date().toISOString()
    });
  },

  trackOfflineSync: (syncedCount: number, errorCount: number) => {
    if (errorCount > 0) {
      toast.error(`Falha em ${errorCount} registros na sincronização offline.`);
    }
    return pontoMonitorService.logEvent('OFFLINE_SYNC_COMPLETE', {
      syncedCount,
      errorCount,
      timestamp: new Date().toISOString()
    });
  }
};
