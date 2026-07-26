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

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

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
        },
      }
    );
  }

  try {
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

    // Endpoint de stats para monitoramento
    if (url.searchParams.get('stats') === 'true') {
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
            ...cachePublic(60),
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
          ...cachePublic(CACHE_TTL_MS / 1000),
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
