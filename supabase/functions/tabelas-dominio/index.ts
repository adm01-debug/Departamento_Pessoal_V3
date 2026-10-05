/**
 * Edge Function: Domain Tables (CBO, CNAE, IRRF, INSS)
 * P4-067: Cache in-memory para tabelas estáticas
 *
 * GET /functions/v1/tabelas-dominio?type=cbo
 * GET /functions/v1/tabelas-dominio?type=cnae
 * GET /functions/v1/tabelas-dominio?type=irrf
 * GET /functions/v1/tabelas-dominio?type=inss
 * GET /functions/v1/tabelas-dominio?type=feriados
 * GET /functions/v1/tabelas-dominio?type=rubricas
 *
 * TTL: 5 minutos (300s) para todas as tabelas de domínio
 * Resposta: Cache-Control: public, max-age=300
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { cachePublic, cachedFetch, getCacheStats } from '../_shared/cache.ts';
import { getCorsHeaders, handlePreflight } from '../_shared/contract.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { getClientIp } from '../_shared/clientIp.ts';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Inicializa cliente Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos suportados
const SUPPORTED_TYPES = ['cbo', 'cnae', 'irrf', 'inss', 'feriados', 'rubricas'] as const;
type DomainType = typeof SUPPORTED_TYPES[number];

// Mapeamento de tipo para tabela
const TABLE_MAP: Record<DomainType, string> = {
  cbo: 'cbo',
  cnae: 'cnae',
  irrf: 'faixas_irrf',
  inss: 'faixas_inss',
  feriados: 'feriados',
  rubricas: 'rubricas_folha',
};

// Colunas por tabela
const COLUMNS_MAP: Record<DomainType, string> = {
  cbo: 'codigo, descricao, grupo',
  cnae: 'codigo, descricao, subclasse',
  irrf: 'faixa, aliquota, deducao',
  inss: 'faixa, aliquota, teto',
  feriados: 'data, nome, tipo, municipio, estado',
  rubricas: 'codigo, descricao, tipo, natureza',
};

serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get('type')?.toLowerCase() as DomainType | null;

  // E-077: CORS via allowlist compartilhada (sem wildcard fixo)
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  // Validação de tipo
  if (!type || !SUPPORTED_TYPES.includes(type)) {
    return new Response(
      JSON.stringify({
        error: 'Tipo inválido',
        supported: SUPPORTED_TYPES,
        example: '/functions/v1/tabelas-dominio?type=cbo',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...cachePublic(60),
          ...getCorsHeaders(req),
        },
      }
    );
  }

  try {
    // Endpoint público — throttle por IP (tabelas de domínio são estáticas;
    // 120/min por IP é folgado para uso legítimo e barre scraping agressivo).
    const rlAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const rl = await checkRateLimit(rlAdmin as never, {
      key: `tabelas-dominio:${getClientIp(req)}`,
      limit: 120,
      windowSec: 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl, req);

    const cacheKey = `domain:${type}`;
    const table = TABLE_MAP[type];
    const columns = COLUMNS_MAP[type];

    // Usa cachedFetch para evitar queries repetidas
    const data = await cachedFetch(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from(table)
          .select(columns)
          .order('codigo', { ascending: true });

        if (error) throw error;
        return data || [];
      },
      CACHE_TTL_MS
    );

    // Endpoint de stats para monitoramento — exige usuário autenticado
    // (expõe internals do cache; o path público fica sem rate limit pesado
    // mas o de stats é gated).
    if (url.searchParams.get('stats') === 'true') {
      const authHeader = req.headers.get('Authorization') ?? '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const { data: authData, error: authErr } = token
        ? await supabase.auth.getUser(token)
        : { data: { user: null }, error: null };
      if (authErr || !authData?.user) {
        return new Response(JSON.stringify({ error: 'Autenticacao obrigatoria para stats' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
        });
      }
      return new Response(
        JSON.stringify({
          data,
          count: data.length,
          cache: getCacheStats(),
          type,
          table,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            // no-store: resposta autenticada não pode ser replayada por cache
            // compartilhado para um cliente sem token.
            'Cache-Control': 'no-store',
            ...getCorsHeaders(req),
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        type,
        table,
        count: data.length,
        data,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(req),
          ...cachePublic(CACHE_TTL_MS / 1000),
          ...getCorsHeaders(req),
        },
      }
    );
  } catch (error) {
    console.error(`[tabelas-dominio] Erro ao buscar ${type}:`, error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao buscar dados' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
