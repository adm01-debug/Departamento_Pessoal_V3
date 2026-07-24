import { supabase } from '@/integrations/supabase/client';
import CryptoJS from 'crypto-js';

const PONTO_OFFLINE_STORAGE_KEY = 'ponto_offline_queue';

function getCryptoKey(): string {
  const sessionData = sessionStorage.getItem('sb-session-id') || '';
  const userAgent = navigator.userAgent || '';
  return CryptoJS.SHA256(`ponto-offline:${sessionData}:${userAgent}`).toString().slice(0, 32);
}
const LEGACY_KEY = 'lovable-ponto-secure-v1';

function decryptQueue(stored: string): OfflineRegistro[] {
  try {
    const bytes = CryptoJS.AES.decrypt(stored, getCryptoKey());
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch {
    try {
      const bytes = CryptoJS.AES.decrypt(stored, LEGACY_KEY);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch {
      return [];
    }
  }
}

function encryptQueue(queue: OfflineRegistro[]): string {
  return CryptoJS.AES.encrypt(JSON.stringify(queue), getCryptoKey()).toString();
}

export interface OfflineRegistro {
  id: string;
  tipo: 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida';
  colaborador_id: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  precisao?: number;
  dispositivoId: string;
  hash?: string;
  foto_base64?: string | null;
}

export const pontoOfflineService = {
  openDB: async () => {
    const { openDB } = await import('idb');
    return openDB('ponto-offline-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos');
        }
      },
    });
  },

  generateIntegrityHash: (data: any) => {
    const payload = `${data.colaborador_id}|${data.timestamp}|${data.tipo}|${data.dispositivoId}`;
    return CryptoJS.SHA256(payload).toString();
  },

  queueRegistro: async (registro: Omit<OfflineRegistro, 'id'>) => {
    const db = await pontoOfflineService.openDB();
    const id = crypto.randomUUID();
    const hash = registro.hash || pontoOfflineService.generateIntegrityHash(registro);
    const entryWithId: OfflineRegistro = { ...registro, id, hash };
    
    // Armazenar foto no IndexedDB se existir (sem limite prático de tamanho)
    if (registro.foto_base64) {
      try {
        await db.put('photos', registro.foto_base64, id);
        // Não salvar o base64 no localStorage para economizar espaço
        entryWithId.foto_base64 = null;
        (entryWithId as any).has_photo_in_idb = true;
      } catch (e) {
        console.error('Falha ao salvar foto no IndexedDB:', e);
      }
    }
    
    // Recuperar fila atual do IndexedDB
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    
    // Salvar o registro (metadados) em uma chave especial ou novo store
    // Para manter compatibilidade com o resto do código sem mudar a versão do DB agora:
    const stored = localStorage.getItem(PONTO_OFFLINE_STORAGE_KEY);
    let queue: OfflineRegistro[] = [];
    
    if (stored) {
      try {
        queue = decryptQueue(stored);
      } catch (e) {
        queue = [];
      }
    }
    
    queue.push(entryWithId);
    const encrypted = encryptQueue(queue);
    localStorage.setItem(PONTO_OFFLINE_STORAGE_KEY, encrypted);
    
    // Disparar evento customizado para notificar abas
    window.dispatchEvent(new Event('ponto-offline-updated'));
    
    return entryWithId;
  },

  syncOfflineQueue: async () => {
    const stored = localStorage.getItem(PONTO_OFFLINE_STORAGE_KEY);
    if (!stored) return { synced: 0, errors: 0 };

    let queue: OfflineRegistro[];
    try {
      queue = decryptQueue(stored);
      if (!queue.length && stored) throw new Error('empty');
    } catch (e) {
      localStorage.removeItem(PONTO_OFFLINE_STORAGE_KEY);
      return { synced: 0, errors: 1 };
    }
    
    if (queue.length === 0) return { synced: 0, errors: 0 };

    let synced = 0;
    let errors = 0;
    const remaining: OfflineRegistro[] = [];
    
    // Notificar monitoramento sobre início do sync
    const startSyncTime = Date.now();
    await (await import('./pontoMonitorService')).pontoMonitorService.logEvent('OFFLINE_SYNC_START', {
      queueSize: queue.length,
      timestamp: new Date().toISOString()
    });

    // Re-anexar fotos do IndexedDB antes do sync
    const db = await pontoOfflineService.openDB();
    const queueWithPhotos = await Promise.all(queue.map(async (item) => {
      if ((item as any).has_photo_in_idb) {
        const photo = await db.get('photos', item.id);
        return { ...item, foto_base64: photo };
      }
      return item;
    }));

    // 1. Enviar lote para a Edge Function de processamento
    try {
      const { data, error } = await supabase.functions.invoke('processar-ponto-offline', {
        body: { registros: queueWithPhotos }
      }) as { data: any; error: any };

      if (error) throw error;
      
      if (data.success) {
        synced = data.success_count || data.success;
        errors = data.error_count || data.errors;
        
        // Se houver erros específicos de registros, mantemos apenas os que falharam na fila
        if (data.details && data.details.length > 0) {
          const failedIds = data.details.map((d: any) => d.id);
          queue.forEach(item => {
            if (failedIds.includes(item.id)) remaining.push(item);
          });
        }
      }
    } catch (err) {
      console.error('[OfflineSync] Falha na comunicação com o servidor:', err);
      return { synced: 0, errors: queue.length };
    }
    // Notificar monitoramento sobre conclusão
    await (await import('./pontoMonitorService')).pontoMonitorService.trackOfflineSync(synced, errors);
    
    if (remaining.length === 0 && (synced > 0 || errors > 0)) {
      localStorage.removeItem(PONTO_OFFLINE_STORAGE_KEY);
      // Limpar fotos do IndexedDB após sync total
      await db.clear('photos');
    } else if (remaining.length > 0) {
      // Limpar fotos apenas dos itens sincronizados
      const failedIds = remaining.map(r => r.id);
      for (const item of queue) {
        if (!failedIds.includes(item.id)) {
          await db.delete('photos', item.id);
        }
      }
      const encrypted = encryptQueue(remaining);
      localStorage.setItem(PONTO_OFFLINE_STORAGE_KEY, encrypted);
    }
    return { synced, errors };
  },

  getQueueSize: () => {
    const stored = localStorage.getItem(PONTO_OFFLINE_STORAGE_KEY);
    if (!stored) return 0;
    try {
      const queue = decryptQueue(stored);
      return queue.length;
    } catch (e) {
      return 0;
    }
  }
};
