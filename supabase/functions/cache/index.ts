import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, createValidationErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

// Onda 23: cache tenant-isolado. O Map em memória é PER-INSTANCE e SEM
// segmentação — sem isolamento por usuário/empresa, um consumidor podia
// ler/poluir cache de outro. Aqui aplicamos:
//  - JWT obrigatória
//  - Namespacing forçado por user_id (+ empresa_id quando aplicável)
//  - Whitelist rígida de tabelas para query_cached
//  - empresa_id obrigatório e escopado em query_cached
//  - TTL clamp [5s, 15min] e limite de payload

const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('get'), key: z.string().min(1).max(256) }),
  z.object({
    action: z.literal('set'),
    key: z.string().min(1).max(256),
    ttlSeconds: z.number().int().min(5).max(900).optional(),
    value: z.any(),
  }),
  z.object({ action: z.literal('invalidate'), key: z.string().min(1).max(256) }),
  z.object({
    action: z.literal('query_cached'),
    table: z.string().min(1).max(64),
    empresaId: z.string().uuid(),
    ttlSeconds: z.number().int().min(5).max(900).optional(),
    query: z.object({
      select: z.string().max(256).optional(),
      limit: z.number().int().min(1).max(1000).optional(),
      orderBy: z.string().max(64).optional(),
      ascending: z.boolean().optional(),
    }).optional(),
  }),
  z.object({ action: z.literal('stats') }),
]);

const ALLOWED_TABLES = new Set([
  'colaboradores', 'departamentos', 'cargos', 'folhas_pagamento',
  'holerites', 'ferias', 'afastamentos', 'beneficios',
]);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const MAX_ENTRIES = 5000;
const MAX_VALUE_BYTES = 256 * 1024; // 256KB por entrada

interface CacheEntry { data: unknown; expiresAt: number; bytes: number }
const cacheStore = new Map<string, CacheEntry>();
let totalBytes = 0;

function evictExpired() {
  const now = Date.now();
  for (const [k, v] of cacheStore.entries()) {
    if (v.expiresAt <= now) {
      totalBytes -= v.bytes;
      cacheStore.delete(k);
    }
  }
}

function evictLRUIfNeeded() {
  while (cacheStore.size >= MAX_ENTRIES) {
    const oldest = cacheStore.keys().next().value; // Map mantém ordem de inserção
    if (!oldest) break;
    const e = cacheStore.get(oldest);
    if (e) totalBytes -= e.bytes;
    cacheStore.delete(oldest);
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return createErrorResponse('Não autenticado', 401, 'UNAUTHORIZED');

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    }
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `cache:${userId}`, limit: 60, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { body: _pb } = await parseJsonBody(req);
    const parsed = BodySchema.safeParse(_pb ?? {});
    if (!parsed.success) return createValidationErrorResponse(parsed.error);
    const body = parsed.data;

    evictExpired();

    // Namespacing forçado — impossível ler cache de outro usuário
    const ns = (k: string, extra = '') => `u:${userId}:${extra}${k}`;

    switch (body.action) {
      case 'get': {
        const entry = cacheStore.get(ns(body.key));
        if (entry && entry.expiresAt > Date.now()) {
          return json({ success: true, hit: true, data: entry.data });
        }
        return json({ success: true, hit: false, data: null });
      }

      case 'set': {
        const serialized = JSON.stringify(body.value ?? null);
        if (serialized.length > MAX_VALUE_BYTES) {
          return createErrorResponse('Payload excede 256KB', 413, 'PAYLOAD_TOO_LARGE');
        }
        const ttl = (body.ttlSeconds ?? 300) * 1000;
        const key = ns(body.key);
        const prev = cacheStore.get(key);
        if (prev) totalBytes -= prev.bytes;
        evictLRUIfNeeded();
        cacheStore.set(key, {
          data: body.value ?? null,
          expiresAt: Date.now() + ttl,
          bytes: serialized.length,
        });
        totalBytes += serialized.length;
        return json({ success: true, key: body.key, expiresIn: ttl / 1000 });
      }

      case 'invalidate': {
        const key = ns(body.key);
        const prev = cacheStore.get(key);
        if (prev) totalBytes -= prev.bytes;
        const existed = cacheStore.delete(key);
        return json({ success: true, existed });
      }

      case 'query_cached': {
        if (!ALLOWED_TABLES.has(body.table)) {
          return createErrorResponse('Tabela não permitida em cache', 403, 'FORBIDDEN_TABLE');
        }
        // Tenant scope obrigatório
        const { data: belongs } = await admin.rpc('user_belongs_to_empresa', {
          _user_id: userId,
          _empresa_id: body.empresaId,
        });
        if (!belongs) {
          const { data: isAdmin } = await admin.rpc('is_admin', { _user_id: userId });
          if (!isAdmin) return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');
        }

        const cacheKey = ns(
          `t:${body.table}:${body.empresaId}:${JSON.stringify(body.query ?? {})}`,
          'q:',
        );
        const entry = cacheStore.get(cacheKey);
        if (entry && entry.expiresAt > Date.now()) {
          return json({ success: true, hit: true, data: entry.data, source: 'cache' });
        }

        // select whitelist simples — apenas identificadores/wildcards/vírgulas
        const rawSel = body.query?.select ?? '*';
        const safeSel = /^[a-zA-Z0-9_,\s\*\(\)]+$/.test(rawSel) ? rawSel : '*';

        let q = admin.from(body.table).select(safeSel).eq('empresa_id', body.empresaId);
        q = q.limit(body.query?.limit ?? 100);
        if (body.query?.orderBy && /^[a-zA-Z0-9_]+$/.test(body.query.orderBy)) {
          q = q.order(body.query.orderBy, { ascending: body.query.ascending ?? true });
        }

        const { data, error } = await q;
        if (error) {
          console.warn('query_cached erro:', error.message);
          return createErrorResponse('Falha ao consultar', 500, 'QUERY_ERROR');
        }

        const serialized = JSON.stringify(data ?? []);
        if (serialized.length <= MAX_VALUE_BYTES) {
          evictLRUIfNeeded();
          cacheStore.set(cacheKey, {
            data,
            expiresAt: Date.now() + (body.ttlSeconds ?? 60) * 1000,
            bytes: serialized.length,
          });
          totalBytes += serialized.length;
        }
        return json({ success: true, hit: false, data, source: 'database' });
      }

      case 'stats': {
        return json({
          success: true,
          stats: {
            entries: cacheStore.size,
            approx_bytes: totalBytes,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  } catch (err) {
    await captureException(err, { function: 'cache' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
