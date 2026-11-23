import { supabase } from '@/integrations/supabase/client';
import { loggerService } from './loggerService';
import type { Json } from '@/integrations/supabase/database.types';
import { validateTablePayload } from '@/schemas/validate';

// `applicationServerKey` também aceita string base64url, mas decodificar para
// bytes evita depender do suporte de cada navegador a esse atalho.
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export const pushNotificationService = {
  async isSupported(): Promise<boolean> {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  /**
   * Chave pública VAPID. Env primeiro (Vercel), com fallback em
   * `configuracoes.vapid_public_key` — a chave PRIVADA nunca mora no banco
   * (seria legível pela publishable key do bundle; ver `_shared/webPush.ts`).
   */
  async getVapidPublicKey(): Promise<string | null> {
    const doAmbiente = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
    if (doAmbiente) return doAmbiente;

    const { data, error } = await supabase
      .from('configuracoes')
      .select('vapid_public_key')
      .not('vapid_public_key', 'is', null)
      .limit(1)
      .maybeSingle();

    if (error) {
      loggerService.error('Falha ao ler vapid_public_key de configuracoes', {}, error);
      return null;
    }
    return data?.vapid_public_key?.trim() || null;
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

      const vapidKey = await this.getVapidPublicKey();
      if (!vapidKey) {
        throw new Error(
          'Chave pública VAPID não configurada: sem ela o navegador cria uma inscrição que nenhum servidor consegue entregar. Defina VITE_VAPID_PUBLIC_KEY ou configuracoes.vapid_public_key.'
        );
      }

      // Inscrição anterior (feita sem applicationServerKey ou com outra chave)
      // precisa sair: o navegador rejeita subscribe() com chave diferente da
      // inscrição vigente, e uma inscrição sem VAPID nunca entrega.
      const inscricaoAnterior = await registration.pushManager.getSubscription();
      if (inscricaoAnterior) await inscricaoAnterior.unsubscribe();

      const subscribeOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
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

      const { error } = await supabase.from('push_subscriptions').insert(
        validateTablePayload(
          'push_subscriptions',
          {
            user_id: userId,
            subscription: subscription.toJSON() as unknown as Json,
            active: true,
            device_info: JSON.stringify({
              userAgent: navigator.userAgent,
              language: navigator.language,
              platform: (navigator as unknown as { platform?: string }).platform,
            }),
          },
          'pushNotificationService:push_subscriptions'
        )
      );

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
        await supabase
          .from('push_subscriptions')
          .update(
            validateTablePayload('push_subscriptions', { active: false }, 'pushNotificationService:push_subscriptions')
          )
          .eq('user_id', userId);
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
