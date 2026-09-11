// Contrato de entrada do external-db-bridge.
//
// Mantido fora do handler para que os testes exercitem exatamente o mesmo
// schema usado em produção. Não aceite expressões SQL aqui: PostgREST espera
// uma lista de colunas para `on_conflict`, não um fragmento SQL.
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const MAX_FILTER_VALUE_BYTES = 8 * 1024; // 8 KB por valor escalar de filtro
const boundedFilterValue = z.unknown().refine((value) => {
  if (typeof value === "string") return value.length <= MAX_FILTER_VALUE_BYTES;
  if (Array.isArray(value)) return value.every((item) => typeof item !== "string" || item.length <= MAX_FILTER_VALUE_BYTES);
  return true;
}, { message: `Filter value exceeds ${MAX_FILTER_VALUE_BYTES} bytes` });

const FilterSchema = z.object({
  column: z.string().max(120),
  op: z.string().max(20),
  value: boundedFilterValue,
  extraOp: z.string().max(20).optional(),
});

// Uma lista PostgREST de identificadores simples: "empresa_id" ou
// "empresa_id,colaborador_id". Limitar a 240 caracteres evita usar esse
// campo como vetor de payload excessivo e exclui espaços, aspas e SQL.
export const ON_CONFLICT_COLUMNS_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:,[A-Za-z_][A-Za-z0-9_]*)*$/;
export const OnConflictSchema = z.string()
  .min(1)
  .max(240)
  .regex(ON_CONFLICT_COLUMNS_RE, "onConflict must be a comma-separated list of column identifiers");

export const BodySchema = z.object({
  action: z.enum(["select", "insert", "update", "delete", "upsert", "rpc"]),
  table: z.string().max(63).optional(),
  rpcName: z.string().max(63).optional(),
  fn: z.string().max(63).optional(),
  columns: z.string().max(2000).optional(),
  filters: z.array(FilterSchema).max(50).optional(),
  order: z.object({ column: z.string().max(120), ascending: z.boolean().optional() }).optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().min(0).optional(),
  countMode: z.enum(["none", "exact", "planned", "estimated"]).optional(),
  single: z.boolean().optional(),
  onConflict: OnConflictSchema.optional(),
  data: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]).optional(),
  params: z.record(z.unknown()).optional(),
  userId: z.string().max(64).optional(),
}).strict();

/** Maps a validated bridge field to the supabase-js upsert options object. */
export function toUpsertOptions(onConflict: string | undefined): { onConflict?: string } {
  return onConflict === undefined ? {} : { onConflict };
}
