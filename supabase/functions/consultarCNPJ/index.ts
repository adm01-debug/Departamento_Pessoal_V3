import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequest, corsHeaders, createErrorResponse } from '../_shared/contract.ts';
import { cnpjSchema } from '../_shared/schemas/common.ts';
import { cachePublic } from '../_shared/cache.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

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
  const rl = await checkRateLimit(rlClient, { key: `consultarCNPJ:${userData.user.id}`, limit: 15, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const { data, errorResponse } = await validateRequest(req, cnpjSchema);
  if (errorResponse) return errorResponse;

  const { cnpj } = data!;
  const clean = cnpj.replace(/\D/g, '');

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
    if (!res.ok) {
      return createErrorResponse('CNPJ não encontrado', 404, 'NOT_FOUND');
    }

    const d = await res.json();
    return new Response(JSON.stringify({
      cnpj: d.cnpj, razao_social: d.razao_social || '', nome_fantasia: d.nome_fantasia || '',
      situacao_cadastral: d.descricao_situacao_cadastral || '', cnae_principal: d.cnae_fiscal?.toString() || '',
      cnae_descricao: d.cnae_fiscal_descricao || '', natureza_juridica: d.natureza_juridica || '',
      porte: d.descricao_porte || '', logradouro: d.logradouro || '', numero: d.numero || '',
      complemento: d.complemento || '', bairro: d.bairro || '', municipio: d.municipio || '',
      uf: d.uf || '', cep: d.cep || '', telefone: d.ddd_telefone_1 || '', email: d.email || '',
      capital_social: d.capital_social || 0, data_inicio_atividade: d.data_inicio_atividade || '',
      socios: (d.qsa || []).map((s: any) => ({ nome: s.nome_socio, qualificacao: s.qualificacao_socio })),
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        // MP-032: CNPJ raramente muda — cache CDN 24h com SWR de 1h.
        ...cachePublic(86400, 3600),
      },
    });


  } catch (error: unknown) {
    captureException(error);
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});
