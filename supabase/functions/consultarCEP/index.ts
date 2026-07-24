import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequest, corsHeaders, createErrorResponse } from '../_shared/contract.ts';
import { cepSchema } from '../_shared/schemas/common.ts';
import { cachePublic } from '../_shared/cache.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

// MP-032: CEPs são estáveis; cache CDN de 24h + SWR de 1h reduz custo e latência.
const CACHE = cachePublic(60 * 60 * 24, 60 * 60);

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
    // ViaCEP
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (res.ok) {
      const viacep = await res.json();
      if (!viacep.erro) {
        return new Response(JSON.stringify({
          cep: viacep.cep, logradouro: viacep.logradouro || '', complemento: viacep.complemento || '',
          bairro: viacep.bairro || '', localidade: viacep.localidade || '', uf: viacep.uf || '',
          ibge: viacep.ibge || '', ddd: viacep.ddd || '',
        }), { headers });
      }
    }

    // Fallback BrasilAPI
    const res2 = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`);
    if (res2.ok) {
      const d = await res2.json();
      return new Response(JSON.stringify({
        cep: d.cep, logradouro: d.street || '', complemento: '', bairro: d.neighborhood || '',
        localidade: d.city || '', uf: d.state || '', ibge: d.city_ibge || '', ddd: '',
      }), { headers });
    }

    return createErrorResponse('CEP não encontrado', 404, 'NOT_FOUND');
  } catch (error: unknown) {
    captureException(error);
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});
