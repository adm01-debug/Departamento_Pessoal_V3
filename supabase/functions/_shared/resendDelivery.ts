/** A API Resend confirma enfileiramento de e-mail com um recibo `id` não vazio. */
export function resendDeliveryId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const id = (payload as Record<string, unknown>).id;
  if (typeof id !== "string" || id.trim().length === 0) return null;

  return id.trim();
}
