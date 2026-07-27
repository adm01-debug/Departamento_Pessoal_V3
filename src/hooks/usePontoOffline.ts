import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { pontoOfflineService } from '@/services/pontoOfflineService';
import { loggerService } from '@/services/loggerService';
import { useOnMount } from './useMountEffects';

export function usePontoOffline() {
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const updateSize = () => {
    setQueueSize(pontoOfflineService.getQueueSize());
  };

  useEffect(() => {
    window.addEventListener('storage', updateSize);
    window.addEventListener('ponto-offline-updated', updateSize);
    return () => {
      window.removeEventListener('storage', updateSize);
      window.removeEventListener('ponto-offline-updated', updateSize);
    };
  }, []);

  // Inicializa queue size no mount
  useOnMount(() => {
    updateSize();
  });

  const addOffline = async (tipo: 'entrada' | 'saida' | 'saida_almoco' | 'retorno_almoco', colaboradorId: string, geo?: { lat?: number; latitude?: number; lng?: number; longitude?: number; accuracy?: number }) => {
    try {
      await pontoOfflineService.queueRegistro({
        tipo,
        colaborador_id: colaboradorId,
        timestamp: new Date().toISOString(),
        latitude: geo?.lat || geo?.latitude,
        longitude: geo?.lng || geo?.longitude,
        precisao: geo?.accuracy,
        dispositivoId: navigator.userAgent
      });
      updateSize();
      toast.warning('Você está offline. O ponto foi salvo localmente com criptografia e será sincronizado automaticamente quando houver conexão.');
    } catch (error) {
      loggerService.error('Erro ao enfileirar ponto offline', { tipo, colaboradorId }, error instanceof Error ? error : undefined);
      toast.error('Falha ao salvar ponto offline.');
    }
  };

  const sync = async () => {
    if (isSyncing || !navigator.onLine) return;

    setIsSyncing(true);
    try {
      const result = await pontoOfflineService.syncOfflineQueue();
      updateSize();

      if (result.synced > 0) {
        toast.success(`${result.synced} batida(s) offline sincronizada(s) com sucesso!`);
      }
      if (result.errors > 0) {
        toast.error(`${result.errors} batida(s) não puderam ser sincronizadas e permanecem na fila.`);
      }
    } catch (error) {
      loggerService.error('Erro durante sincronização de ponto', { synced: 0, errors: 0 }, error instanceof Error ? error : undefined);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => sync();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sync]);

  // Tenta sincronizar se já estiver online ao montar
  useOnMount(() => {
    if (navigator.onLine) {
      sync();
    }
  });

  return {
    offlineBatidasCount: queueSize,
    addOffline, 
    sync,
    isSyncing 
  };
}
