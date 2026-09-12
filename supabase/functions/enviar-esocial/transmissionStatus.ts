/**
 * Uma transmissão que não chegou ao provedor não é sucesso de negócio. O
 * status HTTP precisa permitir que callers, filas e monitores tentem de novo
 * ou apresentem a falha, em vez de confirmar uma entrega inexistente.
 */
export function transmissionHttpStatus(success: boolean): 200 | 503 {
  return success ? 200 : 503;
}
