import { supabase } from '@/integrations/supabase/client';
import { loggerService } from './loggerService';
import type { Json } from '@/integrations/supabase/database.types';

export const pushNotificationService = {
  async isSupported(): Promise<boolean> {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  async getSubscription(): Promise<PushSubscription | null> {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  },

  async subscribeUser(userId: string): Promise<boolean> {
    try {
      if (!(await this.isSupported())) {
        throw new Error('Notificações Push não são suportadas neste navegador.');
      }

      const registration = await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permissão para notificações negada.');
      }

      // Em um cenário real, usaríamos uma VAPID KEY real do env
      // const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      const subscribeOptions = {
        userVisibleOnly: true,
        // applicationServerKey: vapidKey
      };

      const subscription = await registration.pushManager.subscribe(subscribeOptions);

      // Save to Supabase.
      // BUG corrigido: a tabela real de `push_subscriptions` (a que de fato
      // foi criada — havia duas migrations `CREATE TABLE IF NOT EXISTS`
      // conflitantes para essa tabela, e só a primeira surtiu efeito) guarda
      // a assinatura inteira em `subscription: Json`, com `active` (não
      // `ativo`) e `device_info` como texto (não objeto), sem coluna
      // `endpoint`/`p256dh`/`auth_key` e sem constraint única para upsert.
      // O payload antigo tinha 4 colunas inexistentes — o PostgREST rejeitava
      // o insert inteiro, então inscrever-se para push sempre falhava.
      const { endpoint } = subscription.toJSON();
      if (!endpoint) throw new Error('Endpoint de push inválido');

      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: userId,
        subscription: subscription.toJSON() as unknown as Json,
        active: true,
        device_info: JSON.stringify({
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: (navigator as unknown as { platform?: string }).platform,
        }),
      });

      if (error) throw error;
      return true;
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      loggerService.error('Erro ao subscrever para Push', { userId }, err);
      throw err;
    }
  },

  async unsubscribeUser(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();

        // Não há coluna `endpoint` nem constraint única em `subscription`
        // para localizar a assinatura exata deste dispositivo (ver nota em
        // `subscribeUser`); desativa todas as assinaturas push do usuário.
        await supabase.from('push_subscriptions').update({ active: false }).eq('user_id', userId);
      }
      return true;
    } catch (e: unknown) {
      loggerService.error(
        'Erro ao cancelar subscrição Push',
        { userId },
        e instanceof Error ? e : new Error(String(e))
      );
      return false;
    }
  },
};
