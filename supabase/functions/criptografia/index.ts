import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, createValidationErrorResponse } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

// Onda 23: hardening critico.
// Bug original: fallback usava SUPABASE_SERVICE_ROLE_KEY como password de
// criptografia — vazaria a chave via oráculo criptográfico. Agora:
//  - `ENCRYPTION_MASTER_KEY` obrigatória (fail-closed → 503)
//  - Client NUNCA fornece password — ela é sempre server-side
//  - JWT obrigatória em todas as ações
//  - Payload cap 128KB para evitar DoS
//  - AAD (Additional Authenticated Data) = user_id, isolando ciphertexts por usuário

const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('encrypt'), data: z.union([z.string(), z.record(z.any()), z.array(z.any())]) }),
  z.object({
    action: z.literal('decrypt'),
    data: z.object({
      encrypted: z.string().min(1),
      salt: z.string().min(1),
      iv: z.string().min(1),
    }),
  }),
  z.object({ action: z.literal('hash'), data: z.union([z.string(), z.record(z.any()), z.array(z.any())]) }),
  z.object({ action: z.literal('generate_token'), length: z.number().int().min(16).max(128).optional() }),
]);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const MASTER_KEY = Deno.env.get('ENCRYPTION_MASTER_KEY') ?? '';

const MAX_PAYLOAD_BYTES = 128 * 1024;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(MASTER_KEY), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!MASTER_KEY || MASTER_KEY.length < 32) {
      return createErrorResponse(
        'Serviço de criptografia não configurado',
        503, 'CRYPTO_NOT_CONFIGURED',
      );
    }

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

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const adminClient = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(adminClient, { key: `crypto:${userId}`, limit: 60, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return createErrorResponse('Payload excede 128KB', 413, 'PAYLOAD_TOO_LARGE');
    }
    const parsed = BodySchema.safeParse(JSON.parse(raw || '{}'));
    if (!parsed.success) return createValidationErrorResponse(parsed.error);
    const body = parsed.data;

    // AAD: liga o ciphertext ao usuário → impede replay cross-user
    const aad = encoder.encode(`u:${userId}`);

    switch (body.action) {
      case 'encrypt': {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(salt);
        const plaintext = typeof body.data === 'string' ? body.data : JSON.stringify(body.data);
        const enc = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv, additionalData: aad },
          key,
          encoder.encode(plaintext),
        );
        return json({
          success: true,
          data: { encrypted: b64(enc), salt: b64(salt.buffer), iv: b64(iv.buffer) },
        });
      }

      case 'decrypt': {
        try {
          const salt = fromB64(body.data.salt);
          const iv = fromB64(body.data.iv);
          const key = await deriveKey(salt);
          const dec = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv, additionalData: aad },
            key,
            fromB64(body.data.encrypted),
          );
          const text = decoder.decode(dec);
          let out: unknown;
          try { out = JSON.parse(text); } catch { out = text; }
          return json({ success: true, data: out });
        } catch {
          // Erro genérico — nunca vazar detalhes de descriptografia (oracle)
          return createErrorResponse('Falha ao descriptografar', 400, 'DECRYPT_FAILED');
        }
      }

      case 'hash': {
        const input = typeof body.data === 'string' ? body.data : JSON.stringify(body.data);
        const buf = await crypto.subtle.digest('SHA-256', encoder.encode(input));
        const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
        return json({ success: true, data: { hash: hex, algorithm: 'SHA-256' } });
      }

      case 'generate_token': {
        const len = body.length ?? 32;
        const bytes = crypto.getRandomValues(new Uint8Array(len));
        const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
        return json({ success: true, data: { token, length: token.length } });
      }
    }
  } catch (err) {
    await captureException(err, { function: 'criptografia' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
