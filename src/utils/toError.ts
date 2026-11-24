/**
 * Helper para converter `unknown` (de catch) em Error tipado.
 * Substitui o pattern `catch (err: any)` que era onipresente no código.
 * Use sempre que precisar de uma stack trace ou mensagem segura.
 *
 * @example
 *   try { ... } catch (err) {
 *     const e = toError(err);
 *     loggerService.error('Falhou', {}, e);
 *   }
 */
export function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (typeof e === 'string') return new Error(e);
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return new Error((e as { message: string }).message);
  }
  try {
    return new Error(JSON.stringify(e));
  } catch {
    return new Error(String(e));
  }
}

/**
 * Extrai mensagem de erro de unknown de forma segura (nunca lança).
 */
export function toErrorMessage(e: unknown): string {
  return toError(e).message;
}
