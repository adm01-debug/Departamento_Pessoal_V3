// external-db-bridge — Hardened gateway (Onda 36)
// Segurança: JWT via getUser() para writes, tenant scope (empresa_id),
// denylist de tabelas sensíveis, allowlist de RPC e operadores, validação
// estrita de identificadores, CSRF fail-closed, no-store, payload cap.
//
// Filosofia: leituras anônimas continuam permitidas (compatibilidade com o
// frontend atual — RLS no banco externo é a fonte de verdade), mas qualquer
// operação de escrita exige JWT válido + verificação de tenant.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { verifyCsrf } from "../_shared/csrf.ts";
import { corsHeaders, enforceOrigin, handlePreflight } from '../_shared/contract.ts';
import {
  isSafeTableName, isSafeColumnsExpr, isSafeOrderColumn, isSafeOrExpression, isSafeFilterColumn,
  TABLE_DENYLIST, TENANT_SCOPED_TABLES, RPC_ALLOWLIST, FILTER_OPS, NOT_EXTRA_OPS,
} from "./validation.ts";

// -------------------- Headers --------------------
const NO_STORE = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };

// -------------------- Limites e thresholds --------------------
const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB
const MAX_LIMIT = 1000;
const SLOW_QUERY_THRESHOLD_MS = 3000;
const VERY_SLOW_QUERY_THRESHOLD_MS = 8000;

// -------------------- Timeout de consulta (Onda 37) --------------------
// Evita que uma consulta ao banco externo pendure a invocação indefinidamente.
// Cada request HTTP do supabase-js recebe um AbortSignal com timeout; ao estourar,
// a consulta é abortada (libera recursos) e o handler responde 504.
const BRIDGE_QUERY_TIMEOUT_MS = Number(Deno.env.get("BRIDGE_QUERY_TIMEOUT_MS") || "15000");
const timeoutFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: (init as RequestInit | undefined)?.signal ?? AbortSignal.timeout(BRIDGE_QUERY_TIMEOUT_MS) });
function isTimeoutError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return e.name === "TimeoutError" || e.name === "AbortError" || /timed out|aborted|timeout/i.test(e.message);
}

const LOGIN_PROTECTION_RPC_FALLBACKS: Record<string, unknown> = {
  check_login_lock: false,
  record_failed_login: null,
  reset_login_attempts: null,
};

// -------------------- Zod schemas --------------------
const MAX_FILTER_VALUE_BYTES = 8 * 1024; // 8 KB por valor escalar de filtro
const boundedFilterValue = z.unknown().refine((v) => {
  if (typeof v === "string") return v.length <= MAX_FILTER_VALUE_BYTES;
  if (Array.isArray(v)) return v.every((x) => typeof x !== "string" || x.length <= MAX_FILTER_VALUE_BYTES);
  return true;
}, { message: `Filter value exceeds ${MAX_FILTER_VALUE_BYTES} bytes` });
const FilterSchema = z.object({
  column: z.string().max(120),
  op: z.string().max(20),
  value: boundedFilterValue,
  extraOp: z.string().max(20).optional(),
});

const BodySchema = z.object({
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
  data: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]).optional(),
  params: z.record(z.unknown()).optional(),
  userId: z.string().max(64).optional(),
}).strict();

// -------------------- Telemetria --------------------
interface TelemetryMeta {
  operation: string;
  table?: string;
  rpcName?: string;
  limit?: number;
  offset?: number;
  countMode?: string;
  durationMs: number;
  recordCount?: number;
  status: "ok" | "error" | "slow" | "very_slow";
  error?: string;
  userId?: string | null;
}
function classifySeverity(durationMs: number, hasError: boolean): TelemetryMeta["status"] {
  if (hasError) return "error";
  if (durationMs >= VERY_SLOW_QUERY_THRESHOLD_MS) return "very_slow";
  if (durationMs >= SLOW_QUERY_THRESHOLD_MS) return "slow";
  return "ok";
}
// ---------- Buffer batch de telemetria (reduz INSERTs de 446/s → ~10/s) ----------
// Estratégia:
//   - Buffer in-isolate (Deno mantém isolates warm entre requests, então o
//     buffer sobrevive entre invocações e o batch acontece organicamente).
//   - Flush quando: buffer atinge MAX_BATCH, ou passou FLUSH_INTERVAL_MS
//     desde o último flush, o que ocorrer primeiro.
//   - Eventos `error` continuam sendo enviados individualmente para não perder
//     sinais críticos em cold-start / crash de isolate.
type TelemetryRow = {
  operation: string;
  table_name: string | null;
  rpc_name: string | null;
  duration_ms: number;
  record_count: number | null;
  query_limit: number | null;
  query_offset: number | null;
  count_mode: string | null;
  severity: string;
  error_message: string | null;
  user_id: string | null;
};
const TELEMETRY_MAX_BATCH = 25;
const TELEMETRY_FLUSH_INTERVAL_MS = 2000;
const telemetryBuffer: TelemetryRow[] = [];
let telemetryLastFlush = Date.now();
let telemetryFlushInFlight: Promise<void> | null = null;

function getServiceClient() {
  const localUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!localUrl || !serviceKey) return null;
  return createClient(localUrl, serviceKey);
}

const TELEMETRY_BUFFER_CAP = 500; // evita crescimento ilimitado em modo degradado

async function flushTelemetry(): Promise<void> {
  if (telemetryBuffer.length === 0) return;
  if (telemetryFlushInFlight) return telemetryFlushInFlight;

  const batch = telemetryBuffer.splice(0, telemetryBuffer.length);
  telemetryLastFlush = Date.now();
  const client = getServiceClient();
  if (!client) {
    // Sem client disponível — devolve itens ao buffer (com cap para evitar OOM)
    const keep = batch.slice(0, TELEMETRY_BUFFER_CAP - telemetryBuffer.length);
    telemetryBuffer.unshift(...keep);
    return;
  }

  telemetryFlushInFlight = (async () => {
    try {
      const { error } = await client.from("query_telemetry").insert(batch);
      if (error) {
        console.warn("[telemetry-batch] persist falhou:", error.message);
        // Devolve ao buffer para nova tentativa (com cap para evitar OOM)
        const keep = batch.slice(0, Math.max(0, TELEMETRY_BUFFER_CAP - telemetryBuffer.length));
        telemetryBuffer.unshift(...keep);
      }
    } catch (e) {
      console.warn("[telemetry-batch] exceção:", (e as Error).message);
      const keep = batch.slice(0, Math.max(0, TELEMETRY_BUFFER_CAP - telemetryBuffer.length));
      telemetryBuffer.unshift(...keep);
    } finally {
      telemetryFlushInFlight = null;
    }
  })();
  return telemetryFlushInFlight;
}

function enqueueTelemetry(row: TelemetryRow) {
  telemetryBuffer.push(row);
  const sizeReady = telemetryBuffer.length >= TELEMETRY_MAX_BATCH;
  const timeReady = Date.now() - telemetryLastFlush >= TELEMETRY_FLUSH_INTERVAL_MS;
  if (sizeReady || timeReady) {
    // Fire-and-forget — não bloqueia a request
    flushTelemetry().catch(() => {});
  }
}

function emitTelemetry(meta: TelemetryMeta) {
  const icon =
    meta.status === "very_slow" ? "🔴" : meta.status === "slow" ? "🟡" : meta.status === "error" ? "❌" : "✅";
  const target = meta.rpcName || meta.table || "unknown";
  const line =
    `${icon} [telemetry] ${meta.operation}:${target} ${meta.durationMs}ms` +
    ` | records=${meta.recordCount ?? "-"} limit=${meta.limit ?? "-"} offset=${meta.offset ?? "-"} count=${meta.countMode ?? "-"}`;
  if (meta.status === "very_slow") console.warn(`⚠️ VERY SLOW: ${line}`);
  else if (meta.status === "slow") console.warn(`⚠️ SLOW: ${line}`);
  else if (meta.status === "error") console.error(line + ` error=${meta.error}`);
  else console.info(line);

  if (meta.status === "ok") return;

  const row: TelemetryRow = {
    operation: meta.operation,
    table_name: meta.table || null,
    rpc_name: meta.rpcName || null,
    duration_ms: meta.durationMs,
    record_count: meta.recordCount ?? null,
    query_limit: meta.limit ?? null,
    query_offset: meta.offset ?? null,
    count_mode: meta.countMode || null,
    severity: meta.status,
    error_message: meta.error || null,
    user_id: meta.userId || null,
  };

  // Erros vão direto (não podem ser perdidos em cold-start).
  if (meta.status === "error") {
    const client = getServiceClient();
    if (client) {
      client.from("query_telemetry").insert(row).then(
        ({ error }) => { if (error) console.warn("[telemetry-persist]", error.message); },
      );
    }
    return;
  }

  // slow / very_slow → batched
  enqueueTelemetry(row);
}

// -------------------- Sanitização de valores --------------------
function sanitizeData(val: unknown): unknown {
  if (val === "undefined" || val === "null" || val === undefined) return null;
  if (Array.isArray(val)) return val.map(sanitizeData);
  if (val !== null && typeof val === "object") {
    const obj: Record<string, unknown> = {};
    for (const key in val as Record<string, unknown>) {
      obj[key] = sanitizeData((val as Record<string, unknown>)[key]);
    }
    return obj;
  }
  return val;
}

// -------------------- Respostas padronizadas --------------------
function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: message, code, ...extra }), { status, headers: NO_STORE });
}
function jsonOk(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status: 200, headers: NO_STORE });
}

// -------------------- Tenant scope check --------------------
function extractEmpresaIdsFromData(
  data: Record<string, unknown> | Record<string, unknown>[] | undefined,
): Set<string> {
  const empresaIds = new Set<string>();
  if (!data) return empresaIds;
  const rows = Array.isArray(data) ? data : [data];
  for (const r of rows) {
    const eid = (r as Record<string, unknown>)?.empresa_id;
    if (typeof eid === "string" && eid) empresaIds.add(eid);
  }
  return empresaIds;
}

function empresaIdColumnFor(table: string): string {
  return table === "empresas" ? "id" : "empresa_id";
}

async function lookupEmpresaIdsForWrite(
  externalClient: SupabaseClient<any, any, any>,
  table: string,
  filters: Array<{ column: string; op: string; value: unknown }>,
): Promise<{ ok: true; empresaIds: Set<string> } | { ok: false }> {
  const col = empresaIdColumnFor(table);
  // Query dinâmica (tabela/coluna vêm de string em runtime): tipo do proxy é any por natureza.
  let query: any = externalClient.from(table).select(col);
  for (const f of filters) {
    if (f.op === "eq") query = query.eq(f.column, f.value);
  }
  const { data, error } = await query;
  if (error) return { ok: false };
  const empresaIds = new Set<string>();
  if (Array.isArray(data)) {
    for (const row of data as Record<string, unknown>[]) {
      const eid = row?.[col];
      if (typeof eid === "string" && eid) empresaIds.add(eid);
    }
  }
  return { ok: true, empresaIds };
}

async function assertTenantScope(
  localClient: SupabaseClient<any, any, any>,
  userId: string,
  empresaIds: Set<string>,
): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (empresaIds.size === 0) return { ok: true };

  // Verifica via RPC has_role(admin) primeiro
  const { data: isAdminData } = await localClient.rpc("is_admin", { _user_id: userId });
  if (isAdminData === true) return { ok: true };

  for (const eid of empresaIds) {
    const { data: belongs } = await localClient.rpc("user_belongs_to_empresa", {
      _user_id: userId,
      _empresa_id: eid,
    });
    if (belongs !== true) return { ok: false, msg: `Tenant scope denied for empresa_id=${eid}` };
  }
  return { ok: true };
}

// ============================================================
// Handler principal
// ============================================================
Deno.serve(async (req) => {
  const __pf = handlePreflight(req); if (__pf) return __pf;
  const __og = enforceOrigin(req); if (__og) return __og;if (req.method !== "POST") return jsonError(405, "METHOD_NOT_ALLOWED", "Only POST is allowed");

  // CSRF fail-closed em toda operação de escrita/rpc.
  const csrf = await verifyCsrf(req);
  if (!csrf.ok && csrf.response) return csrf.response;

  // Cap payload
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return jsonError(413, "PAYLOAD_TOO_LARGE", `Payload exceeds ${MAX_PAYLOAD_BYTES} bytes`);
  }

  // Auth (opcional para reads; obrigatório para writes/rpc).
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  let user: { id: string } | null = null;

  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token && token !== supabaseAnonKey) {
      try {
        const localClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await localClient.auth.getUser();
        if (!error && data?.user?.id) {
          user = { id: data.user.id };
        }
      } catch { /* segue anônimo */ }
    }
  }

  // Body + validação estrutural (leitura streaming com corte precoce em MAX_PAYLOAD_BYTES)
  let rawBody: unknown;
  try {
    const reader = req.body?.getReader();
    if (!reader) {
      rawBody = {};
    } else {
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_PAYLOAD_BYTES) {
          try { await reader.cancel(); } catch { /* ignore */ }
          return jsonError(413, "PAYLOAD_TOO_LARGE", `Payload exceeds ${MAX_PAYLOAD_BYTES} bytes`);
        }
        chunks.push(value);
      }
      const buf = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
      const text = new TextDecoder().decode(buf);
      rawBody = text.length ? JSON.parse(text) : {};
    }
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body");
  }

  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError(400, "SCHEMA_VALIDATION", "Invalid request shape", {
      issues: parsed.error.issues.slice(0, 5),
    });
  }
  const body = parsed.data;
  const { action, table, columns, limit, offset, countMode } = body;
  const rpcName = body.rpcName || body.fn;
  const rpcArgs = sanitizeData(body.params ?? body.data) as Record<string, unknown> | null;
  const data = sanitizeData(body.data) as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const filters = (body.filters ?? [])
    .map((f) => ({ ...f, value: sanitizeData(f.value) }))
    .filter((f) => f.op === "or" || (f.value !== null && f.value !== undefined && f.value !== "" && f.value !== "all"));

  // Validação: writes e RPCs protegidas exigem auth
  const isWrite = action === "insert" || action === "update" || action === "delete" || action === "upsert";
  // RPCs públicas: chamadas antes/fora de sessão de usuário (login protection + onboarding).
  // Todos os demais RPCs do allowlist operam sobre dados tenant-scoped e requerem auth.
  const PUBLIC_RPCS = new Set<string>([
    "check_login_lock", "record_failed_login", "reset_login_attempts",
    "check_account_lockout", "record_login_attempt", "reset_account_lockout",
    "check_brute_force", "check_rate_limit", "is_ip_blocked", "is_ip_whitelisted",
    "is_country_allowed",
    "get_admissao_por_token",
  ]);
  const isProtectedRpc = action === "rpc" && rpcName != null && !PUBLIC_RPCS.has(rpcName);
  if ((isWrite || isProtectedRpc) && !user) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required for this operation");
  }

  // Rate limit — bridge é o endpoint mais genérico: 100 req/min para reads, 30 req/min para writes
  if (serviceKey) {
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rlClient = createClient(supabaseUrl, serviceKey);
    const rlIdentity = user?.id ?? (req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'anon');
    const rlKey = isWrite ? `bridge-write:${rlIdentity}` : `bridge-read:${rlIdentity}`;
    const rlLimit = isWrite ? 30 : (user ? 100 : 20);
    const rl = await checkRateLimit(rlClient as any, { key: rlKey, limit: rlLimit, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);
  }

  // Validação: table obrigatório para non-rpc + regex + denylist
  if (action !== "rpc") {
    if (!isSafeTableName(table)) {
      return jsonError(400, "INVALID_TABLE", "Table name is invalid");
    }
    if (TABLE_DENYLIST.has(table!)) {
      return jsonError(403, "TABLE_DENIED", `Table '${table}' is not accessible via bridge`);
    }
    if (columns !== undefined && !isSafeColumnsExpr(columns)) {
      return jsonError(400, "INVALID_COLUMNS", "Columns expression is invalid");
    }
  }

  // Validação de operadores nos filtros
  for (const f of filters) {
    if (!FILTER_OPS.has(f.op)) {
      return jsonError(400, "INVALID_OP", `Filter operator '${f.op}' is not allowed`);
    }
    if (f.op === "not" && (!f.extraOp || !NOT_EXTRA_OPS.has(f.extraOp))) {
      return jsonError(400, "INVALID_NOT_OP", "Filter 'not' requires a valid extraOp");
    }
    if (f.op !== "or" && !isSafeFilterColumn(f.column)) {
      return jsonError(400, "INVALID_COLUMN", `Filter column '${f.column}' is invalid`);
    }
  }

  // UPDATE/DELETE só aplicam filtros 'eq' na query real (ver abaixo). Se o
  // chamador enviar QUALQUER outro operador (neq/gt/like/...), esses filtros
  // seriam silenciosamente ignorados na hora de montar a query — e com zero
  // filtros 'eq' efetivos, a mutação atingiria a tabela inteira. Em vez de
  // aceitar e descartar em silêncio, rejeitamos explicitamente (fail-closed).
  if (action === "update" || action === "delete") {
    const nonEq = filters.find((f) => f.op !== "eq");
    if (nonEq) {
      return jsonError(
        400,
        "UNSUPPORTED_FILTER_FOR_WRITE",
        `${action} only supports 'eq' filters; operator '${nonEq.op}' on column '${nonEq.column}' would be silently ignored and is rejected instead`,
      );
    }
    if (filters.length === 0) {
      return jsonError(400, "WRITE_REQUIRES_FILTER", `${action} requires at least one 'eq' filter`);
    }
  }

  // Externo
  const externalUrl = Deno.env.get("EXTERNAL_DB_URL");
  const externalKey = Deno.env.get("EXTERNAL_DB_KEY");
  if (!externalUrl || !externalKey) {
    return jsonError(500, "NOT_CONFIGURED", "External database not configured");
  }
  const externalClient = createClient(externalUrl, externalKey, { global: { fetch: timeoutFetch } });
  // User-scoped client for RPCs that rely on auth.uid() inside the external DB
  const externalUserClient = authHeader
    ? createClient(externalUrl, externalKey, { global: { headers: { Authorization: authHeader }, fetch: timeoutFetch } })
    : externalClient;

  // Cliente local (para verificação de tenant scope via RPC has_role/user_belongs_to_empresa)
  const localClient = serviceKey ? createClient(supabaseUrl, serviceKey) : null;

  // Tenant scope check para writes em tabelas de negócio.
  // - insert/upsert: o tenant afetado vem do `empresa_id` nas linhas de `data`.
  // - update/delete: descobrimos o tenant real das linhas alvo via lookup
  //   (ver `lookupEmpresaIdsForWrite`) usando os mesmos filtros 'eq' da
  //   mutação — não dependemos do cliente declarar `empresa_id` explicitamente.
  if (isWrite && user && localClient && table && TENANT_SCOPED_TABLES.has(table)) {
    let empresaIds: Set<string>;
    if (action === "update" || action === "delete") {
      const lookup = await lookupEmpresaIdsForWrite(externalClient, table, filters);
      if (!lookup.ok) {
        return jsonError(
          403,
          "TENANT_SCOPE_LOOKUP_FAILED",
          `Could not verify tenant scope for ${action} on tenant-scoped table '${table}'`,
        );
      }
      empresaIds = lookup.empresaIds;
    } else {
      empresaIds = extractEmpresaIdsFromData(data);
    }

    const scope = await assertTenantScope(localClient, user.id, empresaIds);
    if (!scope.ok) {
      return jsonError(403, "TENANT_SCOPE_DENIED", scope.msg);
    }
  }

  const selectColumns = columns || "*";
  const queryLimit = typeof limit === "number" ? Math.min(Math.max(limit, -1), MAX_LIMIT) : 100;
  const queryOffset = offset ?? 0;
  const queryCountMode = countMode || "none";

  try {
    // -------- SELECT --------
    if (action === "select") {
      const t0 = performance.now();
      // Query dinâmica: filtros/colunas resolvidos em runtime; tipo do proxy é any.
      let query: any = externalClient
        .from(table!)
        .select(selectColumns, { count: queryCountMode === "none" ? undefined : queryCountMode });
      if (queryLimit !== -1) query = query.range(queryOffset, queryOffset + queryLimit - 1);
      for (const f of filters) {
        if (f.op === "eq") query = query.eq(f.column, f.value);
        else if (f.op === "neq") query = query.neq(f.column, f.value);
        else if (f.op === "gt") query = query.gt(f.column, f.value);
        else if (f.op === "gte") query = query.gte(f.column, f.value);
        else if (f.op === "lt") query = query.lt(f.column, f.value);
        else if (f.op === "lte") query = query.lte(f.column, f.value);
        else if (f.op === "like") query = query.like(f.column, f.value as string);
        else if (f.op === "ilike") query = query.ilike(f.column, f.value as string);
        else if (f.op === "in") query = query.in(f.column, f.value as unknown[]);
        else if (f.op === "is") query = query.is(f.column, f.value as null | boolean);
        else if (f.op === "or") {
          if (!isSafeOrExpression(f.value)) return jsonError(400, "INVALID_OR_FILTER", "Expressão .or() contém operadores ou padrões não permitidos");
          query = query.or(f.value as string);
        }
        else if (f.op === "not") query = query.not(f.column, f.extraOp!, f.value);
        else if (f.op === "contains") query = query.contains(f.column, f.value);
      }
      if (body.order && !isSafeOrderColumn(body.order.column)) {
        return jsonError(400, "INVALID_ORDER_COLUMN", "ORDER BY column contains invalid characters");
      }
      if (body.order) query = query.order(body.order.column, { ascending: body.order.ascending !== false });
      if (body.single) query = query.single();

      const { data: selectData, error, count } = await query;
      const durationMs = Math.round(performance.now() - t0);
      emitTelemetry({
        operation: "select", table, limit: queryLimit, offset: queryOffset, countMode: queryCountMode,
        durationMs, status: classifySeverity(durationMs, !!error),
        recordCount: (selectData as unknown[] | null)?.length ?? 0, error: error?.message, userId: user?.id,
      });
      if (error) { console.error('[bridge] QUERY_ERROR:', error.message, error.hint); return jsonError(400, "QUERY_ERROR", "Falha na consulta"); }
      return jsonOk({ data: selectData, count, duration_ms: durationMs });
    }

    // -------- INSERT --------
    if (action === "insert") {
      const t0 = performance.now();
      const { data: r, error } = await externalClient.from(table!).insert(data as any).select();
      const durationMs = Math.round(performance.now() - t0);
      emitTelemetry({ operation: "insert", table, durationMs, status: classifySeverity(durationMs, !!error), recordCount: r?.length ?? 0, error: error?.message, userId: user?.id });
      if (error) { console.error('[bridge] INSERT_ERROR:', error.message, error.hint); return jsonError(400, "INSERT_ERROR", "Falha na inserção"); }
      return jsonOk({ data: r, duration_ms: durationMs });
    }

    // -------- UPSERT --------
    if (action === "upsert") {
      const t0 = performance.now();
      const { data: r, error } = await externalClient.from(table!).upsert(data as any).select();
      const durationMs = Math.round(performance.now() - t0);
      emitTelemetry({ operation: "upsert", table, durationMs, status: classifySeverity(durationMs, !!error), recordCount: r?.length ?? 0, error: error?.message, userId: user?.id });
      if (error) { console.error('[bridge] UPSERT_ERROR:', error.message, error.hint); return jsonError(400, "UPSERT_ERROR", "Falha no upsert"); }
      return jsonOk({ data: r, duration_ms: durationMs });
    }

    // -------- UPDATE --------
    if (action === "update") {
      if (filters.length === 0) {
        return jsonError(400, "UPDATE_REQUIRES_FILTER", "UPDATE requires at least one filter");
      }
      // Require at least one eq filter to prevent overly-broad updates
      if (!filters.some((f) => f.op === "eq")) {
        return jsonError(400, "UPDATE_REQUIRES_EQ", "UPDATE requires at least one 'eq' filter for safety");
      }
      const t0 = performance.now();
      let query = externalClient.from(table!).update(data as any);
      for (const f of filters) {
        if (f.op === "eq") query = query.eq(f.column, f.value);
        else if (f.op === "neq") query = query.neq(f.column, f.value);
        else if (f.op === "gt") query = query.gt(f.column, f.value);
        else if (f.op === "gte") query = query.gte(f.column, f.value);
        else if (f.op === "lt") query = query.lt(f.column, f.value);
        else if (f.op === "lte") query = query.lte(f.column, f.value);
        else if (f.op === "in") query = query.in(f.column, f.value as unknown[]);
        else if (f.op === "is") query = query.is(f.column, f.value as null | boolean);
      }
      const { data: r, error } = await query.select();
      const durationMs = Math.round(performance.now() - t0);
      emitTelemetry({ operation: "update", table, durationMs, status: classifySeverity(durationMs, !!error), recordCount: r?.length ?? 0, error: error?.message, userId: user?.id });
      if (error) { console.error('[bridge] UPDATE_ERROR:', error.message, error.hint); return jsonError(400, "UPDATE_ERROR", "Falha na atualização"); }
      return jsonOk({ data: r, duration_ms: durationMs });
    }

    // -------- DELETE --------
    if (action === "delete") {
      if (filters.length === 0) {
        return jsonError(400, "DELETE_REQUIRES_FILTER", "DELETE requires at least one filter");
      }
      if (!filters.some((f) => f.op === "eq")) {
        return jsonError(400, "DELETE_REQUIRES_EQ", "DELETE requires at least one 'eq' filter for safety");
      }
      const t0 = performance.now();
      let query = externalClient.from(table!).delete();
      for (const f of filters) {
        if (f.op === "eq") query = query.eq(f.column, f.value);
        else if (f.op === "neq") query = query.neq(f.column, f.value);
        else if (f.op === "gt") query = query.gt(f.column, f.value);
        else if (f.op === "gte") query = query.gte(f.column, f.value);
        else if (f.op === "lt") query = query.lt(f.column, f.value);
        else if (f.op === "lte") query = query.lte(f.column, f.value);
        else if (f.op === "in") query = query.in(f.column, f.value as unknown[]);
        else if (f.op === "is") query = query.is(f.column, f.value as null | boolean);
      }
      const { data: r, error } = await query.select();
      const durationMs = Math.round(performance.now() - t0);
      emitTelemetry({ operation: "delete", table, durationMs, status: classifySeverity(durationMs, !!error), recordCount: r?.length ?? 0, error: error?.message, userId: user?.id });
      if (error) { console.error('[bridge] DELETE_ERROR:', error.message, error.hint); return jsonError(400, "DELETE_ERROR", "Falha na exclusão"); }
      return jsonOk({ data: r, duration_ms: durationMs });
    }

    // -------- RPC --------
    if (action === "rpc") {
      if (!rpcName || !isSafeTableName(rpcName)) {
        return jsonError(400, "INVALID_RPC", "rpc action requires a valid 'rpcName' or 'fn'");
      }
      if (!RPC_ALLOWLIST.has(rpcName)) {
        return jsonError(403, "RPC_DENIED", `RPC '${rpcName}' is not in allowlist`);
      }
      const t0 = performance.now();
      if (rpcName in LOGIN_PROTECTION_RPC_FALLBACKS) {
        const durationMs = Math.round(performance.now() - t0);
        return jsonOk({ data: LOGIN_PROTECTION_RPC_FALLBACKS[rpcName], duration_ms: durationMs });
      }
      const { data: rpcData, error } = await externalUserClient.rpc(rpcName, (rpcArgs || {}) as Record<string, unknown>);
      const durationMs = Math.round(performance.now() - t0);
      emitTelemetry({
        operation: "rpc", rpcName, durationMs, status: classifySeverity(durationMs, !!error),
        recordCount: Array.isArray(rpcData) ? rpcData.length : rpcData ? 1 : 0,
        error: error?.message, userId: user?.id,
      });
      if (error) { console.error('[bridge] RPC_ERROR:', error.message); return jsonError(400, "RPC_ERROR", "Falha na chamada RPC"); }
      return jsonOk({ data: rpcData, duration_ms: durationMs });
    }

    return jsonError(400, "UNKNOWN_ACTION", `Unknown action: ${action}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    if (isTimeoutError(err)) {
      console.error("[external-db-bridge] Timeout:", msg);
      return jsonError(504, "QUERY_TIMEOUT", "A consulta excedeu o tempo limite");
    }
    console.error("[external-db-bridge] Error:", msg);
    return jsonError(500, "INTERNAL_ERROR", "Internal server error");
  }
});
