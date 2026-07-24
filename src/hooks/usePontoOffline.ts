import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { pontoOfflineService } from '@/services/pontoOfflineService';

export function usePontoOffline() {
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const updateSize = () => {
    setQueueSize(pontoOfflineService.getQueueSize());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateSize();
    // Listeners para mudanças (Storage API e Custom Event)
    window.addEventListener('storage', updateSize);
    window.addEventListener('ponto-offline-updated', updateSize);
    return () => {
      window.removeEventListener('storage', updateSize);
      window.removeEventListener('ponto-offline-updated', updateSize);
    };
  }, []);

  const addOffline = async (tipo: any, colaboradorId: string, geo: any) => {
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
      console.error('Erro ao enfileirar ponto offline:', error);
      toast.error('Falha ao salvar ponto offline.');
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.error('Erro durante sincronização de ponto:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => sync();
    window.addEventListener('online', handleOnline);
    // Tenta sincronizar se já estiver online ao montar
    if (navigator.onLine) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      sync();
    }
    return () => window.removeEventListener('online', handleOnline);
  }, [sync]);

  return { 
    offlineBatidasCount: queueSize, 
    addOffline, 
    sync,
    isSyncing 
  };
}
