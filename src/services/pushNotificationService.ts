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

/** Cancela a inscrição push deste navegador. Usado no logout: não pode travar. */
async function cancelarInscricaoDoDispositivo(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  // `getRegistration()` resolve na hora; `serviceWorker.ready` nunca resolve
  // quando não há service worker registrado — travaria o logout.
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.toJSON().endpoint;
  await subscription.unsubscribe();
  await supabase
    .from('push_subscriptions')
    .update(validateTablePayload('push_subscriptions', { active: false }, 'pushNotificationService:push_subscriptions'))
    .eq('user_id', userId)
    .eq('subscription->>endpoint', endpoint ?? '');
}

export const pushNotificationService = {
  async isSupported(): Promise<boolean> {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  /**
   * Chave pública VAPID. Só de variável de ambiente: `configuracoes` tem RLS e
   * apenas admins têm policy de SELECT, então ler a chave de lá funcionaria
   * para admins e falharia para o resto do time — inconsistência pior que
   * exigir rebuild ao rotacionar a chave. A chave privada é secret de Edge
   * Function (`VAPID_PRIVATE_KEY`), nunca do bundle.
   */
  async getVapidPublicKey(): Promise<string | null> {
    return import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() || null;
  },

  /**
   * A inscrição do navegador foi criada com a chave VAPID vigente? Uma
   * inscrição sem chave (ou com chave antiga) existe, aparece como ativa no
   * navegador, mas nenhum servidor consegue entregar nela.
   */
  async hasDeliverableSubscription(): Promise<boolean> {
    const [subscription, chave] = [await this.getSubscription(), await this.getVapidPublicKey()];
    if (!subscription || !chave) return false;

    const atual = subscription.options?.applicationServerKey;
    if (!atual) return false;

    const esperada = urlBase64ToUint8Array(chave);
    const bytes = new Uint8Array(atual);
    if (bytes.length !== esperada.length) return false;
    for (let i = 0; i < bytes.length; i++) if (bytes[i] !== esperada[i]) return false;
    return true;
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
          'Chave pública VAPID não configurada: sem ela o navegador cria uma inscrição que nenhum servidor consegue entregar. Defina VITE_VAPID_PUBLIC_KEY no ambiente do front (Vercel) e reimplante.'
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

  /**
   * Cancela a inscrição push no logout: em navegador compartilhado, sem isso o
   * próximo usuário continua recebendo os avisos da conta anterior. O teto de
   * tempo existe para o logout nunca ficar preso nessa limpeza.
   */
  async unsubscribeCurrentDevice(userId: string, timeoutMs = 2000): Promise<void> {
    try {
      await Promise.race([
        cancelarInscricaoDoDispositivo(userId),
        new Promise((resolve) => setTimeout(resolve, timeoutMs)),
      ]);
    } catch (e: unknown) {
      loggerService.error('Erro ao cancelar push no logout', { userId }, e instanceof Error ? e : new Error(String(e)));
    }
  },

  async unsubscribeUser(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getSubscription();
      if (subscription) {
        const endpoint = subscription.toJSON().endpoint;
        await subscription.unsubscribe();

        // Desativa só a inscrição deste dispositivo. A tabela não tem coluna
        // `endpoint` (a assinatura inteira está em `subscription: Json`), então
        // o recorte é pelo caminho JSON — desativar todas silenciaria os
        // outros navegadores da mesma conta, que continuariam "ativos" na tela.
        await supabase
          .from('push_subscriptions')
          .update(
            validateTablePayload('push_subscriptions', { active: false }, 'pushNotificationService:push_subscriptions')
          )
          .eq('user_id', userId)
          .eq('subscription->>endpoint', endpoint ?? '');
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
