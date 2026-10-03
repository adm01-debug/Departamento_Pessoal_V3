import { z } from 'zod';

/**
 * Validação defensiva na fronteira dos services: valida somente os campos
 * presentes no payload (parse parcial), rejeitando valores fora de domínio
 * (enums, limites numéricos, formatos, uuid). Campos obrigatórios não são
 * exigidos aqui — essa responsabilidade é do banco — o que evita falsas
 * rejeições em payloads de updates e callers com shapes parciais.
 */
export function validateInput(schema: z.ZodObject<z.ZodRawShape>, payload: object, contexto: string): void {
  const result = schema.partial().safeParse(payload);
  if (!result.success) {
    const issue = result.error.issues[0];
    const campo = issue?.path.join('.') || 'payload';
    throw new Error(`${contexto}: campo "${campo}" inválido — ${issue?.message ?? 'valor fora do domínio'}`);
  }
}
