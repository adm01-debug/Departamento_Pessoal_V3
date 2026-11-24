// Idempotency helper — Onda 41
// Uso:
//   const idem = await beginIdempotency(admin, { endpoint, key, requestBody, empresaId, userId });
//   if (idem.replay) return idem.replay;               // resposta original re-servida
//   if (idem.conflict) return idem.conflict;           // mesma key + payload diferente / em curso
//   ... executa lógica ...
//   await completeIdempotency(admin, idem.id, 200, responseJson);
//   return new Response(JSON.stringify(responseJson), { ... });
//
// Requer tabela public.idempotency_keys (migration 20260712190000).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createErrorResponse } from "./contract.ts";

const KEY_MIN = 16;
const KEY_MAX = 128;
const KEY_REGEX = /^[A-Za-z0-9._~:\-]{16,128}$/;

export interface BeginIdempotencyParams {
  endpoint: string;
  key: string | null | undefined;
  requestBody: unknown;
  empresaId?: string | null;
  userId?: string | null;
}

export type IdempotencyReason =
  | 'NEW'
  | 'REPLAY'
  | 'KEY_INVALID'
  | 'KEY_REUSE'
  | 'IN_PROGRESS'
  | 'STORE_ERROR'
  | 'RETRY_AFTER_FAILURE';

export interface BeginIdempotencyResult {
  /** Header não fornecido — segue fluxo sem idempotência */
  skipped: boolean;
  /** ID do registro criado (usar em completeIdempotency) */
  id?: string;
  /** Resposta pronta para retornar (replay de sucesso anterior) */
  replay?: Response;
  /** Resposta pronta para retornar (conflito de idempotência) */
  conflict?: Response;
  /** Razão da decisão — usar para auditoria */
  reason?: IdempotencyReason;
  /** ID do registro pré-existente (em replay/conflict), para correlação de auditoria */
  existingId?: string;
  /** Hashes calculados (para auditoria) */
  keyHash?: string;
  requestHash?: string;
}


async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

export function extractIdempotencyKey(req: Request, bodyFallback?: unknown): string | null {
  const fromHeader =
    req.headers.get("Idempotency-Key") ??
    req.headers.get("idempotency-key") ??
    null;
  if (fromHeader) return fromHeader;
  // Fallback: alguns clientes (ex.: browser via supabase-js) podem não conseguir
  // enviar headers custom em preflights antigos; aceitamos idempotency_key no body.
  if (bodyFallback && typeof bodyFallback === "object") {
    const candidate = (bodyFallback as Record<string, unknown>).idempotency_key
      ?? (bodyFallback as Record<string, unknown>).idempotencyKey;
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return null;
}

export async function beginIdempotency(
  admin: SupabaseClient,
  params: BeginIdempotencyParams,
): Promise<BeginIdempotencyResult> {
  const rawKey = params.key?.trim();
  if (!rawKey) return { skipped: true, reason: 'NEW' };

  if (!KEY_REGEX.test(rawKey)) {
    return {
      skipped: false,
      reason: 'KEY_INVALID',
      conflict: createErrorResponse(
        `Idempotency-Key inválida (${KEY_MIN}-${KEY_MAX} chars alfanuméricos)`,
        400,
        "IDEMPOTENCY_KEY_INVALID",
      ),
    };
  }

  // T005: incluir empresaId para evitar colisão cross-tenant com mesma chave e endpoint
  const keyHash = await sha256Hex(`${params.endpoint}:${params.empresaId ?? ""}:${rawKey}`);
  // Legacy hash (pre-T005 format, without empresaId) — used only during rollout window.
  // Records created before T005 deployment use this format; without the fallback they'd
  // become invisible to new code, causing double-execution during the 24h TTL window.
  const legacyKeyHash = await sha256Hex(`${params.endpoint}:${rawKey}`);
  const requestHash = await sha256Hex(canonicalize(params.requestBody ?? null));

  // Tenta INSERT — se colidir (unique), lemos o existente.
  const { data: inserted, error: insertErr } = await admin
    .from("idempotency_keys")
    .insert({
      key_hash: keyHash,
      endpoint: params.endpoint,
      empresa_id: params.empresaId ?? null,
      user_id: params.userId ?? null,
      request_hash: requestHash,
      status: "in_progress",
    })
    .select("id")
    .maybeSingle();

  if (!insertErr && inserted?.id) {
    // T005 rollout safety: check for a pre-T005 completed record under the legacy hash.
    // Tenant isolation is maintained because legacy records carry empresa_id in the row.
    // Remove this fallback lookup once the idempotency TTL (24h) has elapsed post-deploy.
    if (legacyKeyHash !== keyHash) {
      const { data: legacyRec } = await admin
        .from("idempotency_keys")
        .select("id, request_hash, status, response_status, response_body")
        .eq("key_hash", legacyKeyHash)
        .eq("empresa_id", params.empresaId ?? null)
        .eq("status", "completed")
        .maybeSingle();
      if (legacyRec?.response_body && legacyRec.request_hash === requestHash) {
        // Undo the spurious new record and replay the original completed response.
        await admin.from("idempotency_keys").delete().eq("id", inserted.id);
        return {
          skipped: false,
          reason: 'REPLAY',
          existingId: legacyRec.id,
          keyHash,
          requestHash,
          replay: new Response(JSON.stringify(legacyRec.response_body), {
            status: legacyRec.response_status ?? 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Idempotent-Replay": "true",
            },
          }),
        };
      }
    }
    return { skipped: false, id: inserted.id, reason: 'NEW', keyHash, requestHash };
  }

  // Colisão — carrega registro existente
  const { data: existing } = await admin
    .from("idempotency_keys")
    .select("id, request_hash, status, response_status, response_body, expires_at, created_at")
    .eq("endpoint", params.endpoint)
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!existing) {
    return {
      skipped: false,
      reason: 'STORE_ERROR',
      keyHash,
      requestHash,
      conflict: createErrorResponse(
        "Falha ao registrar idempotência",
        500,
        "IDEMPOTENCY_STORE_ERROR",
      ),
    };
  }

  if (existing.request_hash !== requestHash) {
    return {
      skipped: false,
      reason: 'KEY_REUSE',
      existingId: existing.id,
      keyHash,
      requestHash,
      conflict: createErrorResponse(
        "Idempotency-Key já usada com payload diferente",
        409,
        "IDEMPOTENCY_KEY_REUSE",
      ),
    };
  }

  if (existing.status === "in_progress") {
    // Registros in_progress com mais de 5 minutos são considerados zumbis (função caiu sem completar).
    // Reutilizamos o registro para evitar deadlock permanente.
    const IN_PROGRESS_TTL_MS = 5 * 60 * 1000;
    const createdAt = existing.created_at ? new Date(existing.created_at).getTime() : null;
    const isStale = createdAt !== null && (Date.now() - createdAt) > IN_PROGRESS_TTL_MS;

    if (!isStale) {
      return {
        skipped: false,
        reason: 'IN_PROGRESS',
        existingId: existing.id,
        keyHash,
        requestHash,
        conflict: createErrorResponse(
          "Requisição idempotente em andamento — tente novamente em instantes",
          409,
          "IDEMPOTENCY_IN_PROGRESS",
        ),
      };
    }

    // Registro zumbi — reclamar atomicamente (Codex P1: sem SELECT-then-UPDATE separado).
    // O WHERE status='in_progress' garante que apenas um worker ganha a corrida.
    const { data: claimed } = await admin
      .from("idempotency_keys")
      .update({ status: "in_progress", request_hash: requestHash, response_body: null, response_status: null, completed_at: null })
      .eq("id", existing.id)
      .eq("status", "in_progress")
      .select("id")
      .maybeSingle();
    if (!claimed?.id) {
      // Outro worker reclamou primeiro — rejeitar como in_progress
      return {
        skipped: false,
        reason: 'IN_PROGRESS',
        existingId: existing.id,
        keyHash,
        requestHash,
        conflict: createErrorResponse(
          "Requisição idempotente em andamento — tente novamente em instantes",
          409,
          "IDEMPOTENCY_IN_PROGRESS",
        ),
      };
    }
    return { skipped: false, id: existing.id, reason: 'RETRY_AFTER_FAILURE', existingId: existing.id, keyHash, requestHash };
  }

  if (existing.status === "completed" && existing.response_body) {
    return {
      skipped: false,
      reason: 'REPLAY',
      existingId: existing.id,
      keyHash,
      requestHash,
      replay: new Response(JSON.stringify(existing.response_body), {
        status: existing.response_status ?? 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Idempotent-Replay": "true",
        },
      }),
    };
  }

  // status = 'failed' — permite nova tentativa reciclando o registro
  await admin
    .from("idempotency_keys")

    .update({ status: "in_progress", request_hash: requestHash, response_body: null, response_status: null, completed_at: null })
    .eq("id", existing.id);
  return { skipped: false, id: existing.id, reason: 'RETRY_AFTER_FAILURE', existingId: existing.id, keyHash, requestHash };
}

export async function completeIdempotency(
  admin: SupabaseClient,
  id: string | undefined,
  status: number,
  body: unknown,
): Promise<void> {
  if (!id) return;
  await admin
    .from("idempotency_keys")
    .update({
      status: status >= 200 && status < 300 ? "completed" : "failed",
      response_status: status,
      response_body: body ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function failIdempotency(admin: SupabaseClient, id: string | undefined): Promise<void> {
  if (!id) return;
  await admin
    .from("idempotency_keys")
    .update({ status: "failed", completed_at: new Date().toISOString() })
    .eq("id", id);
}
