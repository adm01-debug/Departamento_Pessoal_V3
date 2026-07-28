import { useQuery } from '@tanstack/react-query';
import { webhookService } from '@/services/webhookService';
import { useEmpresas } from './useEmpresas';
import { useGenericCrud } from './useGenericCrud';

export function useWebhooksAvancados() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  // IMPORTANTE: `empresaId` é passado nas duas formas — como parâmetro dedicado
  // (destrava `enabled` em useGenericCrud, que ignora `empresa_id`/`empresaId`
  // dentro de `filters`) e dentro de `filters` apenas quando definido.
  // Sem isso, a query nunca dispara.
  const crud = useGenericCrud<unknown>({
    queryKey: 'webhooks',
    service: webhookService,
    filters: empresaId ? { empresa_id: empresaId } : {},
    empresaId: empresaId ?? undefined,
  });

  return {
    ...crud,
    webhooks: crud.items,
  };
}

export function useWebhookLogs(webhookId: string) {
  return useQuery({
    queryKey: ['webhook_logs', webhookId],
    queryFn: () => webhookService.listarLogs(webhookId),
    enabled: !!webhookId,
  });
}
