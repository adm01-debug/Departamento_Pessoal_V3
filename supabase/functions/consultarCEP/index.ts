import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequest, corsHeaders, createErrorResponse } from '../_shared/contract.ts';
import { cepSchema } from '../_shared/schemas/common.ts';
import { cachePublic, cachedFetch } from '../_shared/cache.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { safeFetch } from '../_shared/safe-fetch.ts';

// MP-032: CEPs são estáveis; cache CDN de 24h + SWR de 1h reduz custo e latência.
const CACHE = cachePublic(60 * 60 * 24, 60 * 60);

// P4-067 (consumer): TTL 24h para CEP. In-memory cache hit evita chamadas
// repetidas à ViaCEP/BrasilAPI no mesmo isolate.
const CEP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const csrf = await verifyCsrf(req.clone());
  if (!csrf.ok) return csrf.response!;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return createErrorResponse('Autenticação obrigatória', 401, 'UNAUTHORIZED');
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
  }
  const rlClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
  const rl = await checkRateLimit(rlClient, { key: `consultarCEP:${userData.user.id}`, limit: 30, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const { data, errorResponse } = await validateRequest(req, cepSchema);
  if (errorResponse) return errorResponse;

  const { cep } = data!;
  const clean = cep.replace(/\D/g, '');
  const headers = { ...corsHeaders, 'Content-Type': 'application/json', ...CACHE };

  try {
    const viaCepResult = await cachedFetch(
      `cep:viacep:${clean}`,
      async () => {
        const res = await safeFetch(`https://viacep.com.br/ws/${clean}/json/`, { timeoutMs: 8_000, tag: 'webhook' });
        if (!res.ok) return null;
        const json = await res.json();
        return json.erro ? null : json;
      },
      CEP_CACHE_TTL_MS
    );

    if (viaCepResult) {
      return new Response(JSON.stringify({
        cep: viaCepResult.cep, logradouro: viaCepResult.logradouro || '', complemento: viaCepResult.complemento || '',
        bairro: viaCepResult.bairro || '', localidade: viaCepResult.localidade || '', uf: viaCepResult.uf || '',
        ibge: viaCepResult.ibge || '', ddd: viaCepResult.ddd || '',
      }), { headers });
    }

    // Fallback BrasilAPI (também cacheado)
    const brasilApiResult = await cachedFetch(
      `cep:brasilapi:${clean}`,
      async () => {
        const res = await safeFetch(`https://brasilapi.com.br/api/cep/v2/${clean}`, { timeoutMs: 8_000, tag: 'webhook' });
        if (!res.ok) return null;
        return await res.json();
      },
      CEP_CACHE_TTL_MS
    );

    if (brasilApiResult) {
      return new Response(JSON.stringify({
        cep: brasilApiResult.cep, logradouro: brasilApiResult.street || '', complemento: '', bairro: brasilApiResult.neighborhood || '',
        localidade: brasilApiResult.city || '', uf: brasilApiResult.state || '', ibge: brasilApiResult.city_ibge || '', ddd: '',
      }), { headers });
    }

    return createErrorResponse('CEP não encontrado', 404, 'NOT_FOUND');
  } catch (error: unknown) {
    captureException(error);
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});
