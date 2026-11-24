import { z } from 'zod';
import { TABLE_COLUMNS } from './tableColumns';
import { loggerService } from '@/services/loggerService';

/**
 * Validação defensiva na fronteira dos services: valida somente os campos
 * presentes no payload (parse parcial), rejeitando valores fora de domínio
 * (enums, limites numéricos, formatos, uuid). Campos obrigatórios não são
 * exigidos aqui — essa responsabilidade é do banco — o que evita falsas
 * rejeições em payloads de updates e callers com shapes parciais.
 */
/**
 * `.partial()` não existe em objetos com refinamentos (.superRefine) nem em
 * schemas não-objeto (union/record/array): reconstrói um objeto a partir do
 * shape base quando ele existe; sem shape, devolve o schema intacto — parse
 * completo é a única opção e `.partial()` lançaria TypeError.
 */
function toPartials(schema: z.ZodType): z.ZodType {
  const raw = shapeOf(schema);
  if (!raw) return schema;
  const base = z.object(raw);
  return (base as z.ZodObject<z.ZodRawShape>).partial();
}

function shapeOf(schema: z.ZodType): z.ZodRawShape | undefined {
  const s = schema as {
    def?: { shape?: z.ZodRawShape | (() => z.ZodRawShape) };
    _def?: { shape?: z.ZodRawShape | (() => z.ZodRawShape) };
  };
  const def = s.def ?? s._def;
  return typeof def?.shape === 'function' ? def.shape() : def?.shape;
}

/**
 * Campos top-level que rejeitam `undefined` (obrigatórios do schema).
 * Quando o payload cobre TODOS eles (típico de create/insert), o schema
 * completo — incluindo .superRefine/.check — pode rodar; updates parciais
 * seguem pelo caminho .partial() para não exigir campos ausentes.
 */
function requiredKeys(raw: z.ZodRawShape): string[] {
  const req: string[] = [];
  for (const [k, field] of Object.entries(raw)) {
    try {
      if (!(field as z.ZodType).safeParse(undefined).success) req.push(k);
    } catch {
      /* campo sem safeParse — ignora */
    }
  }
  return req;
}

export function validateInput(schema: z.ZodType, payload: object, contexto: string): void {
  // {} passa por qualquer .partial() sem campo obrigatório — um update/insert
  // vazio nunca escreve nada útil e esconde bug no caller.
  if (Object.keys(payload).length === 0) {
    throw new Error(`${contexto}: payload vazio — nenhum campo informado`);
  }

  // Payload completo (todas as chaves obrigatórias presentes): roda o schema
  // INTEIRO — refinamentos cross-field (ex.: data_inicio < data_fim no
  // feriasSchema) só existem no schema original; o .partial() os descarta.
  const raw = shapeOf(schema);
  if (raw) {
    const payloadKeys = new Set(Object.keys(payload));
    const complete = requiredKeys(raw).every((k) => payloadKeys.has(k));
    if (complete) {
      const full = schema.safeParse(payload);
      if (!full.success) {
        const issue = full.error.issues[0];
        const campo = issue?.path.join('.') || 'payload';
        throw new Error(`${contexto}: campo "${campo}" inválido — ${issue?.message ?? 'valor fora do domínio'}`);
      }
      return;
    }
  }

  const result = toPartials(schema).safeParse(payload);
  if (!result.success) {
    const issue = result.error.issues[0];
    const campo = issue?.path.join('.') || 'payload';
    throw new Error(`${contexto}: campo "${campo}" inválido — ${issue?.message ?? 'valor fora do domínio'}`);
  }
}

const warnedTables = new Set<string>();

/**
 * Validação estrutural genérica para QUALQUER escrita, mesmo sem schema de
 * domínio: rejeita payload vazio e chaves que não são colunas da tabela
 * (typos de coluna chegavam ao PostgREST e falhavam — ou piores, escreviam
 * em coluna errada por similaridade). Não valida valores: isso é papel dos
 * schemas de domínio via validateInput.
 *
 * Tabela fora do mapa (types.ts atrás do schema): loga uma vez e deixa
 * passar — fail-open, porque o banco rejeita coluna inexistente de qualquer
 * forma. Retorna o payload inalterado para uso inline:
 *   .insert(validateTablePayload('ferias', payload, 'ferias.criar'))
 */
export function validateTablePayload<T>(table: string, payload: T, contexto: string): T {
  const cols = TABLE_COLUMNS[table];
  if (!cols) {
    if (!warnedTables.has(table)) {
      warnedTables.add(table);
      loggerService.warn(`validateTablePayload: tabela "${table}" fora do mapa gerado (regenerar types.ts)`, {
        contexto,
      });
    }
    return payload;
  }
  const valid = new Set(cols);
  const items = (Array.isArray(payload) ? payload : [payload]) as unknown[];
  if (items.length === 0) {
    throw new Error(`${contexto}: payload vazio — array [] não escreve nada`);
  }
  for (const item of items) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error(`${contexto}: payload inválido — esperado objeto ou array de objetos`);
    }
    const keys = Object.keys(item);
    if (keys.length === 0) {
      throw new Error(`${contexto}: payload vazio — nenhum campo informado`);
    }
    const bad = keys.filter((k) => !valid.has(k));
    if (bad.length > 0) {
      throw new Error(`${contexto}: coluna(s) desconhecida(s) em "${table}": ${bad.join(', ')}`);
    }
  }
  return payload;
}
