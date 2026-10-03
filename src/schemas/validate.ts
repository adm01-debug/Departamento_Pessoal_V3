import { z } from 'zod';

/**
 * Validação defensiva na fronteira dos services: valida somente os campos
 * presentes no payload (parse parcial), rejeitando valores fora de domínio
 * (enums, limites numéricos, formatos, uuid). Campos obrigatórios não são
 * exigidos aqui — essa responsabilidade é do banco — o que evita falsas
 * rejeições em payloads de updates e callers com shapes parciais.
 */
/**
 * `.partial()` não existe em objetos com refinamentos (.superRefine):
 * reconstrói um objeto a partir do shape base nesse caso.
 */
function toPartials(schema: z.ZodType): z.ZodType {
  const s = schema as {
    def?: { shape?: z.ZodRawShape | (() => z.ZodRawShape) };
    _def?: { shape?: z.ZodRawShape | (() => z.ZodRawShape) };
  };
  const def = s.def ?? s._def;
  const raw = typeof def?.shape === 'function' ? def.shape() : def?.shape;
  const base = raw ? z.object(raw) : schema;
  return (base as z.ZodObject<z.ZodRawShape>).partial();
}

export function validateInput(schema: z.ZodType, payload: object, contexto: string): void {
  const result = toPartials(schema).safeParse(payload);
  if (!result.success) {
    const issue = result.error.issues[0];
    const campo = issue?.path.join('.') || 'payload';
    throw new Error(`${contexto}: campo "${campo}" inválido — ${issue?.message ?? 'valor fora do domínio'}`);
  }
}
